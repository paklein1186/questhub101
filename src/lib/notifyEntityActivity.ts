import { supabase } from "@/integrations/supabase/client";

export async function notifyEntityFollowersAndMembers({
  entityType, entityId, entityName, actorUserId, notifType, title, body, deepLinkUrl,
  followersOnly = false,
}: {
  entityType: string;
  entityId: string;
  entityName: string;
  actorUserId: string;
  notifType: string;
  title: string;
  body: string;
  deepLinkUrl: string;
  followersOnly?: boolean;
}) {
  try {
    const { data, error } = await supabase.functions.invoke("notify-fan-out", {
      body: {
        entityType,
        entityId,
        entityName,
        actorUserId,
        notifType,
        title,
        notifBody: body,
        deepLinkUrl,
        followersOnly,
      },
    });

    if (error) {
      console.error("[notifyEntityFollowersAndMembers] Edge function error, falling back to client-side:", error);
      // Fallback to client-side dispatch if edge function fails
      await clientSideFallback({ entityType, entityId, actorUserId, notifType, title, body, deepLinkUrl, followersOnly });
    } else if (data?.skipped) {
      console.info("[notifyEntityFollowersAndMembers] Skipped:", data.reason);
    }
  } catch (err) {
    console.error("[notifyEntityFollowersAndMembers] Error, falling back:", err);
    await clientSideFallback({ entityType, entityId, actorUserId, notifType, title, body, deepLinkUrl, followersOnly });
  }
}

/** Client-side fallback if edge function is unavailable */
async function clientSideFallback({
  entityType, entityId, actorUserId, notifType, title, body, deepLinkUrl, followersOnly,
}: {
  entityType: string; entityId: string; actorUserId: string;
  notifType: string; title: string; body: string; deepLinkUrl: string; followersOnly: boolean;
}) {
  try {
    const notifiedSet = new Set<string>();
    const rows: any[] = [];

    if (!followersOnly) {
      const tableCfg: Record<string, { table: string; col: string }> = {
        GUILD: { table: "guild_members", col: "guild_id" },
        COMPANY: { table: "company_members", col: "company_id" },
      };
      const cfg = tableCfg[entityType];
      if (cfg) {
        const { data } = await supabase
          .from(cfg.table as any)
          .select("user_id")
          .eq(cfg.col, entityId)
          .limit(500);
        for (const m of data ?? []) {
          if ((m as any).user_id === actorUserId) continue;
          notifiedSet.add((m as any).user_id);
          rows.push({
            user_id: (m as any).user_id,
            type: notifType,
            title,
            body,
            related_entity_type: entityType,
            related_entity_id: entityId,
            deep_link_url: deepLinkUrl,
          });
        }
      }
    }

    const { data: followers } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("target_type", entityType)
      .eq("target_id", entityId)
      .limit(500);
    for (const f of followers ?? []) {
      if (f.follower_id === actorUserId || notifiedSet.has(f.follower_id)) continue;
      rows.push({
        user_id: f.follower_id,
        type: notifType,
        title,
        body,
        related_entity_type: entityType,
        related_entity_id: entityId,
        deep_link_url: deepLinkUrl,
      });
    }

    if (rows.length > 0) {
      await supabase.from("notifications").insert(rows);
    }
  } catch (err) {
    console.error("[notifyEntityFollowersAndMembers fallback]", err);
  }
}
