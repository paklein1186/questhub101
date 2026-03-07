import { supabase } from "@/integrations/supabase/client";

export async function notifyEntityFollowersAndMembers({
  entityType, entityId, entityName, actorUserId, notifType, title, body, deepLinkUrl,
}: {
  entityType: string;
  entityId: string;
  entityName: string;
  actorUserId: string;
  notifType: string;
  title: string;
  body: string;
  deepLinkUrl: string;
}) {
  try {
    const notifiedSet = new Set<string>();
    const rows: any[] = [];

    // Members
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
        .limit(300);
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

    // Followers
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
    console.error("[notifyEntityFollowersAndMembers]", err);
  }
}
