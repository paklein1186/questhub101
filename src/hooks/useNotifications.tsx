import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import type { Notification } from "@/types";
import { NotificationType, NotificationEntityType, CommentTargetType } from "@/types/enums";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// ─── Notification Preferences ───────────────────────────────

export interface NotificationPreferences {
  notifyOnQuestUpdates: boolean;
  notifyOnComments: boolean;
  notifyOnBookings: boolean;
  notifyOnPodMessages: boolean;
  notifyOnGuildActivity: boolean;
  notifyOnFollowerActivity: boolean;
  notifyOnXpAndAchievements: boolean;
  notificationFrequency: "INSTANT" | "DAILY" | "WEEKLY" | "NEVER";
  pushEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  notifyOnQuestUpdates: true,
  notifyOnComments: true,
  notifyOnBookings: true,
  notifyOnPodMessages: true,
  notifyOnGuildActivity: true,
  notifyOnFollowerActivity: true,
  notifyOnXpAndAchievements: true,
  notificationFrequency: "INSTANT",
  pushEnabled: false,
};

function prefKeyForType(type: NotificationType): keyof NotificationPreferences | null {
  switch (type) {
    case NotificationType.QUEST_UPDATE:
    case NotificationType.QUEST_CREATED:
    case NotificationType.QUEST_UPDATED:
    case NotificationType.QUEST_COMPLETED:
      return "notifyOnQuestUpdates";
    case NotificationType.COMMENT:
    case NotificationType.QUEST_COMMENT:
    case NotificationType.UPVOTE:
    case NotificationType.QUEST_UPVOTE:
      return "notifyOnComments";
    case NotificationType.BOOKING:
    case NotificationType.BOOKING_REQUESTED:
    case NotificationType.BOOKING_CONFIRMED:
    case NotificationType.BOOKING_CANCELLED:
    case NotificationType.BOOKING_UPDATED:
    case NotificationType.BOOKING_REQUIRES_PAYMENT:
      return "notifyOnBookings";
    case NotificationType.POD_CREATED:
    case NotificationType.POD_MESSAGE:
      return "notifyOnPodMessages";
    case NotificationType.GUILD_MEMBER_ADDED:
    case NotificationType.GUILD_ROLE_CHANGED:
    case NotificationType.GUILD_QUEST_CREATED:
    case NotificationType.INVITE:
      return "notifyOnGuildActivity";
    case NotificationType.FOLLOWER_NEW:
    case NotificationType.FOLLOWER_ACTIVITY:
      return "notifyOnFollowerActivity";
    case NotificationType.XP_GAINED:
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return "notifyOnXpAndAchievements";
    default:
      return null;
  }
}

// ─── Browser Push Helper ────────────────────────────────────

function sendBrowserNotification(title: string, body: string, deepLinkUrl: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new window.Notification(title, { body, icon: "/favicon.ico", tag: `qh-${Date.now()}` });
    n.onclick = () => { window.focus(); window.location.href = deepLinkUrl; n.close(); };
  } catch { /* silent */ }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// ─── Deep-link helpers ──────────────────────────────────────

export function linkForNotification(n: Notification): string {
  if (n.deepLinkUrl) return n.deepLinkUrl;
  const data = (n.data || {}) as Record<string, unknown>;

  // Type-specific routing
  switch (n.type) {
    case NotificationType.COMMENT:
    case NotificationType.UPVOTE:
    case NotificationType.QUEST_COMMENT:
    case NotificationType.QUEST_UPVOTE: {
      const targetType = (data.targetType as string) || n.relatedEntityType;
      const targetId = (data.targetId as string) || n.relatedEntityId;
      if (targetType && targetId) return buildNotifDeepLink(targetType, targetId);
      return "/";
    }
    case NotificationType.QUEST_UPDATE:
    case NotificationType.QUEST_CREATED:
    case NotificationType.QUEST_UPDATED:
    case NotificationType.QUEST_COMPLETED:
    case NotificationType.QUEST_PROPOSAL_SUBMITTED:
    case NotificationType.QUEST_PROPOSAL_ACCEPTED:
    case NotificationType.QUEST_PROPOSAL_REJECTED:
    case NotificationType.QUEST_FUNDED_CREDITS:
    case NotificationType.QUEST_FUNDED_FIAT:
    case NotificationType.USER_QUEST_UPDATE_FROM_FOLLOWED:
    case NotificationType.SYSTEM_NEW_PUBLIC_QUEST:
      return `/quests/${(data.questId as string) || n.relatedEntityId || ""}`;
    case NotificationType.INVITE:
    case NotificationType.GUILD_MEMBER_ADDED:
    case NotificationType.GUILD_ROLE_CHANGED:
    case NotificationType.GUILD_QUEST_CREATED:
    case NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST:
      return data.guildId ? `/guilds/${data.guildId as string}` : (n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "GUILD", n.relatedEntityId) : "/");
    case NotificationType.POD_CREATED:
    case NotificationType.POD_MESSAGE:
    case NotificationType.UNIT_NEW_POD_JOIN_REQUEST:
      return `/pods/${(data.podId as string) || n.relatedEntityId || ""}`;
    case NotificationType.BOOKING:
    case NotificationType.BOOKING_REQUESTED:
    case NotificationType.BOOKING_CONFIRMED:
    case NotificationType.BOOKING_CANCELLED:
    case NotificationType.BOOKING_UPDATED:
    case NotificationType.BOOKING_REQUIRES_PAYMENT:
    case NotificationType.USER_BOOKING_STATUS_CHANGED:
    case NotificationType.UNIT_BOOKING_REQUEST:
    case NotificationType.UNIT_BOOKING_CONFIRMED:
    case NotificationType.UNIT_BOOKING_CANCELLED:
      return data.bookingId ? `/bookings/${data.bookingId as string}` : (n.relatedEntityId ? `/bookings/${n.relatedEntityId}` : "/work");
    case NotificationType.FOLLOWER_NEW:
      return `/users/${(data.followerId as string) || n.relatedEntityId || ""}`;
    case NotificationType.FOLLOWER_ACTIVITY:
      return n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "USER", n.relatedEntityId) : "/network";
    case NotificationType.XP_GAINED:
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return n.relatedEntityId ? `/achievements/${n.relatedEntityId}` : "/me";
    case NotificationType.UNIT_PARTNERSHIP_REQUEST:
    case NotificationType.UNIT_PARTNERSHIP_ACCEPTED:
      return n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "GUILD", n.relatedEntityId) : "/work";
    case NotificationType.UNIT_NEW_QUEST_CREATED_UNDER_UNIT:
    case NotificationType.UNIT_NEW_QUEST_UPDATE:
    case NotificationType.UNIT_NEW_COMMENT_ON_QUEST:
      return `/quests/${(data.questId as string) || n.relatedEntityId || ""}`;
    case NotificationType.UNIT_EVENT_CREATED:
      return `/events/${(data.eventId as string) || n.relatedEntityId || ""}`;
    case NotificationType.UNIT_COURSE_CREATED:
      return `/courses/${(data.courseId as string) || n.relatedEntityId || ""}`;
    case NotificationType.USER_INVITED_TO_UNIT:
      return n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "GUILD", n.relatedEntityId) : "/work";
    case NotificationType.SYSTEM_NEW_USER:
      return n.relatedEntityId ? `/users/${n.relatedEntityId}` : "/admin";
    case NotificationType.SYSTEM_BUG_REPORT:
      return "/admin/content/reports";
    case NotificationType.SYSTEM_ABUSE_REPORT:
      return "/admin/content/reports";
    case NotificationType.SYSTEM_SHARE_PURCHASE:
    case NotificationType.SYSTEM_PAYMENT_FAILED:
    case NotificationType.USER_SHARE_PURCHASE_CONFIRMED:
      return "/admin/economy/payments";
    default:
      break;
  }

  // Universal fallback: use related_entity_type + related_entity_id
  if (n.relatedEntityType && n.relatedEntityId) {
    return buildNotifDeepLink(n.relatedEntityType, n.relatedEntityId);
  }

  return "/notifications";
}

// ─── Store interface ────────────────────────────────────────

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  notifyComment: (params: { commentAuthorId: string; targetType: CommentTargetType; targetId: string; commentId: string; commentSnippet: string; }) => void;
  notifyUpvote: (params: { upvoterId: string; commentAuthorId: string; commentId: string; commentSnippet: string; }) => void;
  notifyQuestUpdate: (params: { questId: string; questUpdateId: string; updateTitle: string; }) => void;
  notifyBooking: (params: { bookingId: string; serviceTitle: string; requesterName: string; recipientUserId: string; action: string; serviceId?: string; requesterId?: string; }) => void;
  notifyGuildMemberAdded: (params: { guildId: string; userId: string }) => void;
  notifyGuildRoleChanged: (params: { guildId: string; userId: string; newRole: string }) => void;
  notifyGuildQuestCreated: (params: { guildId: string; questId: string; questTitle: string }) => void;
  notifyPodInvite: (params: { podId: string; userId: string }) => void;
  notifyPodMessage: (params: { podId: string; authorId: string; snippet: string }) => void;
  notifyNewFollower: (params: { followerId: string; targetUserId: string }) => void;
  notifyXpGained: (params: { userId: string; amount: number; reason: string }) => void;
  notifyAchievement: (params: { userId: string; achievementTitle: string }) => void;
}

const NotificationContext = createContext<NotificationStore>(null!);

// ─── Helper: Build deep link for entity ─────────────────────

function buildNotifDeepLink(targetType: string, targetId: string): string {
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

// ─── Helper: Strip mention tokens for readable snippet ──────

function stripMentionTokens(content: string): string {
  return content.replace(/@\[[^\]]+\]\([^)]+\)/g, (m) => {
    const name = m.match(/@\[([^\]]+)\]/)?.[1] ?? "";
    return `@${name}`;
  });
}

// ─── Helper: Insert notification to DB with dedup + error handling ──

async function insertNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  deepLinkUrl?: string;
  data?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    // Dedup: check if an identical notification was sent in the last 60 seconds
    if (params.relatedEntityId) {
      const cutoff = new Date(Date.now() - 60_000).toISOString();
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", params.userId)
        .eq("type", params.type)
        .eq("related_entity_id", params.relatedEntityId)
        .gte("created_at", cutoff)
        .limit(1);
      if (existing && existing.length > 0) return false; // already sent recently
    }

    const { error } = await supabase.from("notifications").insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      related_entity_type: params.relatedEntityType || null,
      related_entity_id: params.relatedEntityId || null,
      deep_link_url: params.deepLinkUrl || null,
      data: params.data as any || null,
    });
    if (error) {
      console.error("[Notifications] Insert failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Notifications] Insert exception:", err);
    return false;
  }
}

// ─── Helper: Map localStorage prefs to/from DB prefs ────────

function mapLocalToDb(local: NotificationPreferences): Record<string, unknown> {
  return {
    notify_quest_updates_and_comments: local.notifyOnQuestUpdates,
    notify_comments_and_upvotes: local.notifyOnComments,
    notify_booking_status_changes: local.notifyOnBookings,
    notify_follower_activity: local.notifyOnFollowerActivity,
    notify_xp_and_achievements: local.notifyOnXpAndAchievements,
    notification_frequency: local.notificationFrequency,
    push_enabled: local.pushEnabled,
  };
}

function mapDbToLocal(row: Record<string, unknown>): Partial<NotificationPreferences> {
  return {
    notifyOnQuestUpdates: row.notify_quest_updates_and_comments as boolean ?? true,
    notifyOnComments: row.notify_comments_and_upvotes as boolean ?? true,
    notifyOnBookings: row.notify_booking_status_changes as boolean ?? true,
    notifyOnFollowerActivity: row.notify_follower_activity as boolean ?? true,
    notifyOnXpAndAchievements: row.notify_xp_and_achievements as boolean ?? true,
    notificationFrequency: (row.notification_frequency as any) ?? "INSTANT",
    pushEnabled: row.push_enabled as boolean ?? false,
  };
}

// ─── Provider ───────────────────────────────────────────────

export function NotificationProvider({ children, currentUserId }: { children: ReactNode; currentUserId: string }) {
  const { session } = useAuth();
  const userId = session?.user?.id || currentUserId;
  const qc = useQueryClient();

  const { data: dbNotifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []).map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type as NotificationType,
        title: n.title,
        body: n.body ?? "",
        relatedEntityType: n.related_entity_type ?? undefined,
        relatedEntityId: n.related_entity_id ?? undefined,
        deepLinkUrl: n.deep_link_url ?? "",
        isRead: n.is_read,
        createdAt: n.created_at,
        data: n.data as Record<string, unknown> | undefined,
      })) as Notification[];
    },
    refetchInterval: 30000,
  });

  // ── Load preferences from DB, fall back to localStorage ──
  const { data: dbPrefsRow } = useQuery({
    queryKey: ["notification-preferences-sync", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(`notif_prefs_${userId}`);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });

  // Sync DB prefs into local state when loaded
  useEffect(() => {
    if (dbPrefsRow) {
      setPreferences((prev) => ({ ...prev, ...mapDbToLocal(dbPrefsRow as any) }));
    }
  }, [dbPrefsRow]);

  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const updatePreferences = useCallback((partial: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(next));
      prefsRef.current = next;

      // Sync to DB (fire-and-forget)
      if (userId) {
        supabase
          .from("notification_preferences")
          .update(mapLocalToDb(next) as any)
          .eq("user_id", userId)
          .then(() => {});
      }

      return next;
    });
  }, [userId]);

  const unreadCount = dbNotifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }, [userId, qc]);

  const markAllAsRead = useCallback(async () => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }, [userId, qc]);

  const addNotification = useCallback(async (params: {
    userId: string; type: NotificationType | string; title: string; body: string;
    relatedEntityType?: string; relatedEntityId?: string;
    deepLinkUrl: string; data?: Record<string, unknown>;
  }) => {
    // Only check preferences if notification is for the current user
    if (params.userId === userId) {
      const prefKey = prefKeyForType(params.type as NotificationType);
      if (prefKey && !prefsRef.current[prefKey]) return;
      if (prefsRef.current.notificationFrequency === "NEVER") return;
    }

    const inserted = await insertNotification(params);
    if (!inserted) return;

    qc.invalidateQueries({ queryKey: ["notifications", params.userId] });

    // Only send browser push for current user's own notifications
    if (params.userId === userId && prefsRef.current.pushEnabled && prefsRef.current.notificationFrequency === "INSTANT") {
      sendBrowserNotification(params.title, params.body, params.deepLinkUrl);
    }
  }, [userId, qc]);

  // ── Trigger: Comment on entity ──

  const notifyComment = useCallback(async ({ commentAuthorId, targetType, targetId, commentId, commentSnippet }: any) => {
    if (commentAuthorId === userId) return;

    // Resolve the owner of the target entity
    let ownerUserId: string | null = null;
    try {
      if (targetType === "QUEST") {
        const { data } = await supabase.from("quests").select("created_by_user_id").eq("id", targetId).maybeSingle();
        ownerUserId = data?.created_by_user_id ?? null;
      } else if (targetType === "GUILD") {
        const { data } = await supabase.from("guild_members").select("user_id").eq("guild_id", targetId).eq("role", "ADMIN").limit(1);
        ownerUserId = data?.[0]?.user_id ?? null;
      } else if (targetType === "SERVICE") {
        const { data } = await supabase.from("services").select("provider_user_id").eq("id", targetId).maybeSingle();
        ownerUserId = data?.provider_user_id ?? null;
      } else if (targetType === "COMPANY") {
        const { data } = await supabase.from("company_members").select("user_id").eq("company_id", targetId).in("role", ["admin", "owner"]).limit(1);
        ownerUserId = data?.[0]?.user_id ?? null;
      } else if (targetType === "COURSE") {
        const { data } = await supabase.from("courses").select("owner_user_id").eq("id", targetId).maybeSingle();
        ownerUserId = data?.owner_user_id ?? null;
      } else if (targetType === "FEED_POST") {
        const { data } = await supabase.from("feed_posts").select("author_user_id").eq("id", targetId).maybeSingle();
        ownerUserId = data?.author_user_id ?? null;
      } else if (targetType === "USER") {
        ownerUserId = targetId;
      }
    } catch { /* silent */ }

    if (!ownerUserId || ownerUserId === commentAuthorId) return;

    const truncated = (commentSnippet || "").slice(0, 60);
    const entityLabel = targetType.toLowerCase().replace(/_/g, " ");

    await addNotification({
      userId: ownerUserId,
      type: NotificationType.COMMENT,
      title: "New comment",
      body: `Someone commented on your ${entityLabel}: "${truncated}"`,
      relatedEntityType: targetType,
      relatedEntityId: commentId,
      deepLinkUrl: buildNotifDeepLink(targetType, targetId),
      data: { targetType, targetId, commentId },
    });
  }, [userId, addNotification]);

  // ── Trigger: Comment upvote ──

  const notifyUpvote = useCallback(async ({ upvoterId, commentAuthorId, commentId, commentSnippet }: any) => {
    if (commentAuthorId === upvoterId) return;
    await addNotification({
      userId: commentAuthorId, type: NotificationType.UPVOTE,
      title: "Comment upvoted", body: `Someone upvoted your comment: "${(commentSnippet || "").slice(0, 60)}"`,
      relatedEntityType: NotificationEntityType.COMMENT, relatedEntityId: commentId,
      deepLinkUrl: "/notifications",
    });
  }, [addNotification]);

  // ── Trigger: Quest update — notify ALL participants ──

  const notifyQuestUpdate = useCallback(async ({ questId, questUpdateId, updateTitle }: any) => {
    try {
      const { data: participants } = await supabase
        .from("quest_participants")
        .select("user_id")
        .eq("quest_id", questId);
      if (!participants?.length) return;

      for (const p of participants) {
        if (p.user_id === userId) continue; // skip the updater
        await addNotification({
          userId: p.user_id, type: NotificationType.QUEST_UPDATE,
          title: "Quest update", body: `New update: "${updateTitle}"`,
          relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
          deepLinkUrl: `/quests/${questId}#updates`,
        });
      }
    } catch (err) {
      console.error("[Notifications] notifyQuestUpdate error:", err);
    }
  }, [userId, addNotification]);

  // ── Trigger: Booking action ──

  const notifyBooking = useCallback(async ({ bookingId, serviceTitle, requesterName, recipientUserId, action, requesterId }: any) => {
    // Don't self-notify
    if (recipientUserId === requesterId) return;
    const typeMap: Record<string, NotificationType> = {
      requested: NotificationType.BOOKING_REQUESTED, confirmed: NotificationType.BOOKING_CONFIRMED,
      accepted: NotificationType.BOOKING_CONFIRMED, cancelled: NotificationType.BOOKING_CANCELLED,
      declined: NotificationType.BOOKING_CANCELLED,
    };
    const nType = typeMap[action] || NotificationType.BOOKING_UPDATED;
    const msg = action === "requested" ? `${requesterName} requested "${serviceTitle}"` : `Booking for "${serviceTitle}" was ${action}`;
    await addNotification({
      userId: recipientUserId, type: nType,
      title: action === "requested" ? "New booking request" : `Booking ${action}`, body: msg,
      relatedEntityType: NotificationEntityType.BOOKING, relatedEntityId: bookingId,
      deepLinkUrl: `/bookings/${bookingId}`,
    });
  }, [addNotification]);

  // ── Trigger: Guild member added ──

  const notifyGuildMemberAdded = useCallback(async ({ guildId, userId: targetUserId }: any) => {
    if (targetUserId === userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.GUILD_MEMBER_ADDED,
      title: "Added to guild", body: "You were added to a guild",
      relatedEntityType: NotificationEntityType.GUILD, relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
    });
  }, [userId, addNotification]);

  // ── Trigger: Guild role changed ──

  const notifyGuildRoleChanged = useCallback(async ({ guildId, userId: targetUserId, newRole }: any) => {
    if (targetUserId === userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.GUILD_ROLE_CHANGED,
      title: "Role changed", body: `Your guild role was changed to ${newRole}`,
      relatedEntityType: NotificationEntityType.GUILD, relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
    });
  }, [userId, addNotification]);

  // ── Trigger: Guild quest created — notify ALL guild admins ──

  const notifyGuildQuestCreated = useCallback(async ({ guildId, questId, questTitle }: any) => {
    try {
      const { data: admins } = await supabase
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", guildId)
        .eq("role", "ADMIN");
      if (!admins?.length) return;

      for (const admin of admins) {
        if (admin.user_id === userId) continue; // skip the quest creator
        await addNotification({
          userId: admin.user_id, type: NotificationType.GUILD_QUEST_CREATED,
          title: "New guild quest", body: `Quest "${questTitle}" was created in your guild`,
          relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
          deepLinkUrl: `/quests/${questId}`,
        });
      }
    } catch (err) {
      console.error("[Notifications] notifyGuildQuestCreated error:", err);
    }
  }, [userId, addNotification]);

  // ── Trigger: Pod invite ──

  const notifyPodInvite = useCallback(async ({ podId, userId: targetUserId }: any) => {
    if (targetUserId === userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.POD_CREATED,
      title: "Pod invitation", body: "You were invited to a pod",
      relatedEntityType: NotificationEntityType.POD, relatedEntityId: podId,
      deepLinkUrl: `/pods/${podId}`,
    });
  }, [userId, addNotification]);

  // ── Trigger: Pod message — notify ALL pod members except author ──

  const notifyPodMessage = useCallback(async ({ podId, authorId, snippet }: any) => {
    try {
      const { data: members } = await supabase
        .from("pod_members")
        .select("user_id")
        .eq("pod_id", podId);
      if (!members?.length) return;

      for (const member of members) {
        if (member.user_id === authorId) continue; // skip the message author
        await addNotification({
          userId: member.user_id, type: NotificationType.POD_MESSAGE,
          title: "New pod message", body: `"${(snippet || "").slice(0, 60)}"`,
          relatedEntityType: NotificationEntityType.POD, relatedEntityId: podId,
          deepLinkUrl: `/pods/${podId}#chat`,
        });
      }
    } catch (err) {
      console.error("[Notifications] notifyPodMessage error:", err);
    }
  }, [addNotification]);

  // ── Trigger: New follower ──

  const notifyNewFollower = useCallback(async ({ followerId, targetUserId }: any) => {
    if (targetUserId === followerId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.FOLLOWER_NEW,
      title: "New follower", body: "Someone started following you",
      relatedEntityType: NotificationEntityType.USER, relatedEntityId: followerId,
      deepLinkUrl: `/users/${followerId}`,
    });
  }, [addNotification]);

  // ── Trigger: XP gained ──

  const notifyXpGained = useCallback(async ({ userId: targetUserId, amount, reason }: any) => {
    await addNotification({
      userId: targetUserId, type: NotificationType.XP_GAINED,
      title: `+${amount} XP earned`, body: reason,
      relatedEntityType: NotificationEntityType.USER, relatedEntityId: targetUserId,
      deepLinkUrl: "/me",
    });
  }, [addNotification]);

  // ── Trigger: Achievement unlocked ──

  const notifyAchievement = useCallback(async ({ userId: targetUserId, achievementTitle }: any) => {
    await addNotification({
      userId: targetUserId, type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: "Achievement unlocked!", body: achievementTitle,
      relatedEntityType: NotificationEntityType.ACHIEVEMENT, relatedEntityId: "",
      deepLinkUrl: "/me",
    });
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications: dbNotifications, unreadCount, markAsRead, markAllAsRead,
      preferences, updatePreferences,
      notifyComment, notifyUpvote, notifyQuestUpdate, notifyBooking,
      notifyGuildMemberAdded, notifyGuildRoleChanged, notifyGuildQuestCreated,
      notifyPodInvite, notifyPodMessage, notifyNewFollower,
      notifyXpGained, notifyAchievement,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

// Re-export the snippet helper for use in CommentThread
export { stripMentionTokens };
