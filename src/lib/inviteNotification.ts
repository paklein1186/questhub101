import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type EntityType = "quest" | "guild" | "pod" | "company";

const ENTITY_LABELS: Record<EntityType, string> = {
  quest: "Quest",
  guild: "Guild",
  pod: "Pod",
  company: "Organization",
};

const DEEP_LINKS: Record<EntityType, (id: string) => string> = {
  quest: (id) => `/quests/${id}`,
  guild: (id) => `/guilds/${id}`,
  pod: (id) => `/pods/${id}`,
  company: (id) => `/companies/${id}`,
};

/**
 * Send an invite notification to a user, respecting their `notify_invitations_to_units` preference.
 * Fire-and-forget — does not block the invite flow on failure.
 */
export async function sendInviteNotification(params: {
  invitedUserId: string;
  inviterName: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
}) {
  try {
    // Check user preference
    const { data: pref } = await supabase
      .from("notification_preferences")
      .select("notify_invitations_to_units")
      .eq("user_id", params.invitedUserId)
      .maybeSingle();

    // Default to true if no preferences row exists
    if (pref && !pref.notify_invitations_to_units) return;

    // Dedup: skip if same notification sent in last 60s
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", params.invitedUserId)
      .eq("type", "USER_INVITED_TO_UNIT")
      .eq("related_entity_id", params.entityId)
      .gte("created_at", cutoff)
      .limit(1);
    if (existing && existing.length > 0) return;

    const label = ENTITY_LABELS[params.entityType];

    await supabase.from("notifications").insert({
      user_id: params.invitedUserId,
      type: "USER_INVITED_TO_UNIT",
      title: `You've been invited to a ${label}`,
      body: `${params.inviterName} invited you to "${params.entityName}"`,
      related_entity_type: params.entityType.toUpperCase(),
      related_entity_id: params.entityId,
      deep_link_url: DEEP_LINKS[params.entityType](params.entityId),
    });
  } catch (err) {
    logger.error("[InviteNotification] Failed:", err);
  }
}
