import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export async function notifyPlatformAdmins(params: {
  type: string;
  title: string;
  body: string;
  deepLinkUrl: string;
  relatedEntityId?: string;
}) {
  try {
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "superadmin"])
      .limit(20);

    if (!admins?.length) return;

    const uniqueIds = [...new Set(admins.map((a) => a.user_id))];
    const rows = uniqueIds.map((uid) => ({
      user_id: uid,
      type: params.type,
      title: params.title,
      body: params.body,
      deep_link_url: params.deepLinkUrl,
      related_entity_id: params.relatedEntityId ?? null,
    }));
    await supabase.from("notifications").insert(rows);
  } catch (err) {
    logger.error("[notifyPlatformAdmins]", err);
  }
}
