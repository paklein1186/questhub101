import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller via anon client
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerUserId = claims.claims.sub as string;

    // Parse request
    const body = await req.json();
    const {
      entityType,
      entityId,
      entityName,
      actorUserId,
      notifType,
      title,
      notifBody,
      deepLinkUrl,
      followersOnly = false,
    } = body;

    // Ensure actorUserId matches caller
    if (actorUserId !== callerUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for unrestricted access
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── 4.4 Guild grace period: skip fan-out if guild was created < 48h ago ──
    if (entityType === "GUILD") {
      const { data: guild } = await supabase
        .from("guilds")
        .select("created_at")
        .eq("id", entityId)
        .maybeSingle();
      if (guild?.created_at) {
        const ageMs = Date.now() - new Date(guild.created_at).getTime();
        const GRACE_HOURS = 48;
        if (ageMs < GRACE_HOURS * 60 * 60 * 1000) {
          return new Response(
            JSON.stringify({
              ok: true,
              skipped: true,
              reason: `Guild created ${Math.round(ageMs / 3600000)}h ago — within ${GRACE_HOURS}h grace period`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const notifiedSet = new Set<string>();
    const rows: Array<Record<string, unknown>> = [];

    // ── Members (skip if followersOnly) ──
    if (!followersOnly) {
      const tableCfg: Record<string, { table: string; col: string }> = {
        GUILD: { table: "guild_members", col: "guild_id" },
        COMPANY: { table: "company_members", col: "company_id" },
      };
      const cfg = tableCfg[entityType];
      if (cfg) {
        // No hard cap — paginate in batches of 1000
        let offset = 0;
        const batchSize = 1000;
        while (true) {
          const { data } = await supabase
            .from(cfg.table)
            .select("user_id")
            .eq(cfg.col, entityId)
            .range(offset, offset + batchSize - 1);
          if (!data?.length) break;
          for (const m of data) {
            if ((m as any).user_id === actorUserId) continue;
            if (notifiedSet.has((m as any).user_id)) continue;
            notifiedSet.add((m as any).user_id);
            rows.push({
              user_id: (m as any).user_id,
              type: notifType,
              title,
              body: notifBody,
              related_entity_type: entityType,
              related_entity_id: entityId,
              deep_link_url: deepLinkUrl,
            });
          }
          if (data.length < batchSize) break;
          offset += batchSize;
        }
      }
    }

    // ── Followers ──
    {
      let offset = 0;
      const batchSize = 1000;
      while (true) {
        const { data: followers } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("target_type", entityType)
          .eq("target_id", entityId)
          .range(offset, offset + batchSize - 1);
        if (!followers?.length) break;
        for (const f of followers) {
          if (f.follower_id === actorUserId || notifiedSet.has(f.follower_id)) continue;
          notifiedSet.add(f.follower_id);
          rows.push({
            user_id: f.follower_id,
            type: notifType,
            title,
            body: notifBody,
            related_entity_type: entityType,
            related_entity_id: entityId,
            deep_link_url: deepLinkUrl,
          });
        }
        if (followers.length < batchSize) break;
        offset += batchSize;
      }
    }

    // ── Bulk insert in batches of 500 ──
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from("notifications").insert(batch);
      if (error) {
        console.error("[notify-fan-out] Batch insert error:", error);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, notified: inserted, total_recipients: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notify-fan-out] Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
