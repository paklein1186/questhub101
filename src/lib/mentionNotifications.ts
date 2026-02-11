import { supabase } from "@/integrations/supabase/client";

/**
 * After a comment is created, store mentions and send notifications.
 */
export async function processMentions({
  commentId,
  authorUserId,
  authorName,
  mentionedUserIds,
  targetType,
  targetId,
  snippet,
}: {
  commentId: string;
  authorUserId: string;
  authorName: string;
  mentionedUserIds: string[];
  targetType: string;
  targetId: string;
  snippet: string;
}) {
  if (mentionedUserIds.length === 0) return;

  // Filter out self-mentions
  const ids = mentionedUserIds.filter((id) => id !== authorUserId);
  if (ids.length === 0) return;

  // Insert comment_mentions rows
  const mentionRows = ids.map((uid) => ({
    comment_id: commentId,
    mentioned_user_id: uid,
  }));
  await supabase.from("comment_mentions" as any).insert(mentionRows as any);

  // Check notification preferences for each mentioned user
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id, notify_mentions, channel_in_app_enabled")
    .in("user_id", ids);

  const prefsMap = new Map(
    (prefs ?? []).map((p: any) => [p.user_id, p]),
  );

  // Build entity label for the notification
  const entityLabel = targetType.toLowerCase().replace(/_/g, " ");
  const truncatedSnippet = snippet.length > 80 ? `${snippet.slice(0, 77)}…` : snippet;

  // Create notifications for eligible users
  const notifications = ids
    .filter((uid) => {
      const p = prefsMap.get(uid);
      // If no prefs row exists, default to sending
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

function buildDeepLink(targetType: string, targetId: string): string {
  switch (targetType) {
    case "QUEST": return `/quests/${targetId}`;
    case "SERVICE": return `/services/${targetId}`;
    case "GUILD": return `/guilds/${targetId}`;
    case "POD": return `/pods/${targetId}`;
    case "COMPANY": return `/companies/${targetId}`;
    case "COURSE": return `/courses/${targetId}`;
    case "USER": return `/users/${targetId}`;
    default: return `/`;
  }
}
