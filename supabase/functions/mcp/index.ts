// MCP server for changethegame — exposes guild-scoped tools to external AI agents.
// Auth: per-guild API key passed as `Authorization: Bearer ctg_xxx...` or `X-API-Key: ctg_xxx...`.
// Transport: Streamable HTTP (MCP spec).

import { Hono } from "npm:hono@4";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-client-info, apikey, content-type, accept, mcp-session-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type TokenCtx = {
  guildId: string;
  tokenId: string;
  scopes: string[];
  createdBy: string;
};

async function authenticate(req: Request): Promise<TokenCtx | null> {
  const auth = req.headers.get("authorization") ?? "";
  const apiKey =
    req.headers.get("x-api-key") ??
    (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "");
  if (!apiKey || !apiKey.startsWith("ctg_")) return null;

  const hash = await sha256Hex(apiKey);
  const { data, error } = await admin
    .from("guild_mcp_tokens")
    .select("id, guild_id, scopes, created_by, revoked_at")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;

  admin
    .from("guild_mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    guildId: data.guild_id as string,
    tokenId: data.id as string,
    scopes: (data.scopes as string[]) ?? ["read"],
    createdBy: data.created_by as string,
  };
}

// ---------- MCP server factory (per-request, scoped to a guild) ----------

function buildServer(ctx: TokenCtx) {
  const server = new McpServer({
    name: "changethegame-guild",
    version: "0.1.0",
  });

  server.tool({
    name: "list_quests",
    description:
      "List active quests (missions) owned by this guild. Returns id, title, status, description and creation date.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20, maximum: 100 },
        status: {
          type: "string",
          description: "Optional status filter (OPEN, IN_PROGRESS, COMPLETED, ARCHIVED).",
        },
      },
    },
    handler: async ({ limit = 20, status }: { limit?: number; status?: string }) => {
      let q = admin
        .from("quests")
        .select("id, title, description, status, created_at, created_by_user_id")
        .eq("guild_id", ctx.guildId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 100));
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "list_members",
    description: "List members of this guild with their role.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 50, maximum: 200 } },
    },
    handler: async ({ limit = 50 }: { limit?: number }) => {
      const { data: members, error } = await admin
        .from("guild_members")
        .select("user_id, role, joined_at")
        .eq("guild_id", ctx.guildId)
        .order("joined_at", { ascending: false })
        .limit(Math.min(limit, 200));
      if (error) throw new Error(error.message);
      const ids = (members ?? []).map((m: any) => m.user_id);
      const { data: profiles } = ids.length
        ? await admin.from("profiles").select("id, full_name, username").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const out = (members ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        name: map.get(m.user_id)?.full_name ?? map.get(m.user_id)?.username ?? null,
      }));
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    },
  });

  server.tool({
    name: "list_discussions",
    description: "List recent feed posts (discussions) attached to this guild.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", default: 20, maximum: 50 } },
    },
    handler: async ({ limit = 20 }: { limit?: number }) => {
      const { data, error } = await admin
        .from("feed_posts")
        .select("id, content, author_user_id, created_at, context_type, context_id")
        .eq("context_type", "guild")
        .eq("context_id", ctx.guildId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(Math.min(limit, 50));
      if (error) throw new Error(error.message);
      return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
    },
  });

  server.tool({
    name: "create_post",
    description:
      "Publish a new feed post attached to this guild. Authored as the user who created the MCP token.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", minLength: 1, maxLength: 5000 },
      },
      required: ["content"],
    },
    handler: async ({ content }: { content: string }) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data, error } = await admin
        .from("feed_posts")
        .insert({
          author_user_id: ctx.createdBy,
          content: content.trim(),
          context_type: "guild",
          context_id: ctx.guildId,
        })
        .select("id, created_at")
        .single();
      if (error) throw new Error(error.message);
      return {
        content: [{ type: "text", text: `Post created: ${data.id} at ${data.created_at}` }],
      };
    },
  });

  server.tool({
    name: "log_contribution",
    description:
      "Log a contribution (TIME by default) on behalf of the token owner, attached to this guild and optionally a quest.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        quest_id: { type: "string", description: "Optional quest UUID" },
        hours: { type: "number", minimum: 0 },
        contribution_type: {
          type: "string",
          description: "TIME | EXPENSES | SUPPLIES | EQUIPMENT | KNOWLEDGE",
          default: "TIME",
        },
      },
      required: ["title"],
    },
    handler: async (args: any) => {
      if (!ctx.scopes.includes("write")) throw new Error("Token lacks 'write' scope.");
      const { data, error } = await admin
        .from("contribution_logs")
        .insert({
          user_id: ctx.createdBy,
          guild_id: ctx.guildId,
          quest_id: args.quest_id ?? null,
          title: args.title,
          description: args.description ?? null,
          hours_logged: args.hours ?? null,
          contribution_type: args.contribution_type ?? "TIME",
        })
        .select("id, created_at")
        .single();
      if (error) throw new Error(error.message);
      return {
        content: [
          { type: "text", text: `Contribution logged: ${data.id} at ${data.created_at}` },
        ],
      };
    },
  });

  return server;
}

// ---------- HTTP layer ----------

const app = new Hono();

app.options("/*", (c) => new Response("ok", { headers: corsHeaders }));

app.get("/mcp/health", (c) =>
  new Response(JSON.stringify({ ok: true, name: "changethegame-mcp" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  }),
);

app.all("/*", async (c) => {
  const ctx = await authenticate(c.req.raw);
  if (!ctx) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: missing or invalid ctg_ API key." },
        id: null,
      }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const server = buildServer(ctx);
  const transport = new StreamableHttpTransport();
  const res = await transport.handleRequest(c.req.raw, server);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);
