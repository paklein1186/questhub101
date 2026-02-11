import { supabase } from "@/integrations/supabase/client";
import type { MentionedEntity, MentionEntityType } from "@/components/MentionTextarea";

/**
 * After a comment is created, store mentions and send notifications
 * for user mentions AND entity mentions (guild/company/quest admins).
 */
export async function processMentions({
  commentId,
  authorUserId,
  authorName,
  mentionedUserIds,
  mentionedEntities,
  targetType,
  targetId,
  snippet,
}: {
  commentId: string;
  authorUserId: string;
  authorName: string;
  mentionedUserIds: string[];
  mentionedEntities?: MentionedEntity[];
  targetType: string;
  targetId: string;
  snippet: string;
}) {
  // ── 1. Process user mentions (existing behavior) ──
  const userIds = mentionedUserIds.filter((id) => id !== authorUserId);

  if (userIds.length > 0) {
    const mentionRows = userIds.map((uid) => ({
      comment_id: commentId,
      mentioned_user_id: uid,
    }));
    await supabase.from("comment_mentions").insert(mentionRows);

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, notify_mentions, channel_in_app_enabled")
      .in("user_id", userIds);

    const prefsMap = new Map(
      (prefs ?? []).map((p: any) => [p.user_id, p]),
    );

    const entityLabel = targetType.toLowerCase().replace(/_/g, " ");
    const truncatedSnippet = snippet.length > 80 ? `${snippet.slice(0, 77)}…` : snippet;

    const notifications = userIds
      .filter((uid) => {
        const p = prefsMap.get(uid);
        if (!p) return true;
        return p.notify_mentions !== false && p.channel_in_app_enabled !== false;
      })
      .map((uid) => ({
        user_id: uid,
        type: "USER_MENTIONED_IN_COMMENT",
        title: "You were mentioned in a comment",
        body: `${authorName} mentioned you in a comment on a ${entityLabel}: "${truncatedSnippet}"`,
        related_entity_type: targetType,
        related_entity_id: targetId,
        deep_link_url: buildDeepLink(targetType, targetId),
      }));

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }
  }

  // ── 2. Process entity mentions (guild/company/quest) ──
  const entities = (mentionedEntities ?? []).filter((e) => e.entityType !== "user");
  if (entities.length === 0) return;

  // Collect admin user IDs for each entity
  const adminUserIds = new Set<string>();

  const guildIds = entities.filter((e) => e.entityType === "guild").map((e) => e.entityId);
  const companyIds = entities.filter((e) => e.entityType === "company").map((e) => e.entityId);
  const questIds = entities.filter((e) => e.entityType === "quest").map((e) => e.entityId);

  const fetches: Promise<void>[] = [];

  if (guildIds.length > 0) {
    fetches.push(
      supabase
        .from("guild_members")
        .select("user_id")
        .in("guild_id", guildIds)
        .in("role", ["admin", "owner"])
        .then(({ data }) => {
          (data ?? []).forEach((r: any) => adminUserIds.add(r.user_id));
        }),
    );
  }

  if (companyIds.length > 0) {
    fetches.push(
      supabase
        .from("company_members")
        .select("user_id")
        .in("company_id", companyIds)
        .in("role", ["admin", "owner"])
        .then(({ data }) => {
          (data ?? []).forEach((r: any) => adminUserIds.add(r.user_id));
        }),
    );
  }

  if (questIds.length > 0) {
    fetches.push(
      supabase
        .from("quests")
        .select("owner_user_id")
        .in("id", questIds)
        .then(({ data }) => {
          (data ?? []).forEach((r: any) => {
            if (r.owner_user_id) adminUserIds.add(r.owner_user_id);
          });
        }),
    );
  }

  await Promise.all(fetches);

  // Remove self
  adminUserIds.delete(authorUserId);
  if (adminUserIds.size === 0) return;

  const entityNames = entities.map((e) => e.name).join(", ");
  const truncatedSnippet = snippet.length > 80 ? `${snippet.slice(0, 77)}…` : snippet;

  const entityNotifications = [...adminUserIds].map((uid) => ({
    user_id: uid,
    type: "ENTITY_MENTIONED_IN_COMMENT",
    title: "Your entity was mentioned in a comment",
    body: `${authorName} mentioned ${entityNames} in a comment: "${truncatedSnippet}"`,
    related_entity_type: targetType,
    related_entity_id: targetId,
    deep_link_url: buildDeepLink(targetType, targetId),
  }));

  await supabase.from("notifications").insert(entityNotifications);
}

function buildDeepLink(targetType: string, targetId: string): string {
  switch (targetType) {
    case "QUEST": return `/quests/${targetId}`;
    case "SERVICE": return `/services/${targetId}`;
    case "GUILD": return `/guilds/${targetId}`;
    case "POD": return `/pods/${targetId}`;
    case "COMPANY": return `/companies/${targetId}`;
    case "COURSE": return `/courses/${targetId}`;
    case "USER": return `/users/${targetId}`;
    case "GUILD_EVENT": return `/events/${targetId}`;
    case "FEED_POST": return `/`;
    default: return `/`;
  }
}
