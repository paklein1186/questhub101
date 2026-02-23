import type { TFunction } from "i18next";
import type { Notification } from "@/types";

/**
 * Translate a notification's title based on its type using i18n keys.
 * Falls back to the stored title if no translation key exists.
 */
export function translateNotificationTitle(n: Notification, t: TFunction): string {
  const typeKey = `notifications.titles.${n.type}`;
  const translated = t(typeKey, { defaultValue: "" });

  // If we got a real translation (not the key itself), use it
  if (translated && translated !== typeKey) {
    // Handle XP_GAINED which needs interpolation
    if (n.type === "XP_GAINED" && n.title) {
      const amountMatch = n.title.match(/\+(\d+)/);
      if (amountMatch) {
        return t("notifications.titles.XP_GAINED", { amount: amountMatch[1] });
      }
    }
    // Handle join requests that contain entity name
    if ((n.type === "UNIT_NEW_GUILD_JOIN_REQUEST" || n.type === "UNIT_NEW_POD_JOIN_REQUEST") && n.title) {
      const nameMatch = n.title.match(/New join request for (.+)/);
      if (nameMatch) {
        return t(`notifications.titles.${n.type}`, { name: nameMatch[1] });
      }
    }
    return translated;
  }

  return n.title || t("nav.notifications");
}

/**
 * Translate a notification's body using pattern matching and i18n templates.
 * Falls back to the stored body if no pattern matches.
 */
export function translateNotificationBody(n: Notification, t: TFunction): string {
  const body = n.body || "";
  if (!body) return "";

  // Try pattern matching for known body formats
  // "X commented on your entity: "snippet""
  const commentMatch = body.match(/^(.+?) commented on your (.+?): "(.+)"$/);
  if (commentMatch) {
    return t("notifications.bodies.commentedOn", { actor: commentMatch[1], entity: commentMatch[2], snippet: commentMatch[3] });
  }

  // "X upvoted your comment: "snippet""
  const upvoteMatch = body.match(/^(.+?) upvoted your comment: "(.+)"$/);
  if (upvoteMatch) {
    return t("notifications.bodies.upvotedComment", { actor: upvoteMatch[1], snippet: upvoteMatch[2] });
  }

  // 'New update: "title"'
  const updateMatch = body.match(/^New update: "(.+)"$/);
  if (updateMatch) {
    return t("notifications.bodies.questUpdate", { title: updateMatch[1] });
  }

  // "X requested "service""
  const bookingReqMatch = body.match(/^(.+?) requested "(.+)"$/);
  if (bookingReqMatch) {
    return t("notifications.bodies.bookingRequested", { requester: bookingReqMatch[1], service: bookingReqMatch[2] });
  }

  // 'Booking for "service" was action'
  const bookingActionMatch = body.match(/^Booking for "(.+)" was (.+)$/);
  if (bookingActionMatch) {
    return t("notifications.bodies.bookingAction", { service: bookingActionMatch[1], action: bookingActionMatch[2] });
  }

  // "You were added to guild"
  const addedMatch = body.match(/^You were added to (.+)$/);
  if (addedMatch) {
    return t("notifications.bodies.addedToGuild", { guild: addedMatch[1] });
  }

  // "Your role in guild was changed to role"
  const roleMatch = body.match(/^Your role in (.+?) was changed to (.+)$/);
  if (roleMatch) {
    return t("notifications.bodies.roleChanged", { guild: roleMatch[1], role: roleMatch[2] });
  }

  // 'Quest "title" was created in your guild'
  const guildQuestMatch = body.match(/^Quest "(.+)" was created in your guild$/);
  if (guildQuestMatch) {
    return t("notifications.bodies.questCreatedInGuild", { quest: guildQuestMatch[1] });
  }

  // "You were invited to pod"
  const podInviteMatch = body.match(/^You were invited to (.+)$/);
  if (podInviteMatch) {
    return t("notifications.bodies.invitedToPod", { pod: podInviteMatch[1] });
  }

  // "X started following you"
  const followerMatch = body.match(/^(.+?) started following you$/);
  if (followerMatch) {
    return t("notifications.bodies.newFollower", { actor: followerMatch[1] });
  }

  // "X upvoted your post"
  const postUpvoteMatch = body.match(/^(.+?) upvoted your post$/);
  if (postUpvoteMatch) {
    return t("notifications.bodies.upvotedPost", { actor: postUpvoteMatch[1] });
  }

  // "X wants to join entity"
  const joinMatch = body.match(/^(.+?) wants to join (.+)$/);
  if (joinMatch) {
    return t("notifications.bodies.wantsToJoin", { applicant: joinMatch[1], entity: joinMatch[2] });
  }

  // "Your application to join entity was approved!"
  const approvedMatch = body.match(/^Your application to join (.+) was approved!$/);
  if (approvedMatch) {
    return t("notifications.bodies.applicationApproved", { entity: approvedMatch[1] });
  }

  // "Your application to join entity was not accepted"
  const rejectedMatch = body.match(/^Your application to join (.+) was not accepted$/);
  if (rejectedMatch) {
    return t("notifications.bodies.applicationRejected", { entity: rejectedMatch[1] });
  }

  // No pattern matched — return original body
  return body;
}
