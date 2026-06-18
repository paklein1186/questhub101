// Manage MCP tokens for a guild (list / create / revoke).
// Only guild admins (creator or ADMIN member) may call this; checked via RLS using
// the caller's JWT.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "")
    .replace(/\//g, "")
    .replace(/=/g, "");
  return `ctg_${b64}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: claims, error: authErr } = await supabase.auth.getClaims(
    authHeader.slice(7),
  );
  if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const guildId = url.searchParams.get("guild_id");
      if (!guildId) return json({ error: "guild_id required" }, 400);
      const { data, error } = await supabase
        .from("guild_mcp_tokens")
        .select("id, name, token_prefix, scopes, created_at, last_used_at, revoked_at")
        .eq("guild_id", guildId)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ tokens: data ?? [] });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const guildId = body.guild_id as string | undefined;
      const name = (body.name as string | undefined)?.trim();
      const scopes = (body.scopes as string[] | undefined) ?? ["read", "write"];
      if (!guildId || !name) return json({ error: "guild_id and name required" }, 400);

      const raw = randomToken();
      const hash = await sha256Hex(raw);
      const prefix = raw.slice(0, 12);

      const { data, error } = await supabase
        .from("guild_mcp_tokens")
        .insert({
          guild_id: guildId,
          name,
          token_hash: hash,
          token_prefix: prefix,
          scopes,
          created_by: userId,
        })
        .select("id, name, token_prefix, scopes, created_at")
        .single();
      if (error) return json({ error: error.message }, 400);

      return json({ token: raw, record: data });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "id required" }, 400);
      const { error } = await supabase
        .from("guild_mcp_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
