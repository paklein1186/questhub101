import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from "react";
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
  switch (n.type) {
    case NotificationType.COMMENT:
    case NotificationType.UPVOTE: {
      const targetType = data.targetType as CommentTargetType;
      const targetId = data.targetId as string;
      if (targetType === CommentTargetType.GUILD) return `/guilds/${targetId}`;
      if (targetType === CommentTargetType.QUEST) return `/quests/${targetId}`;
      if (targetType === CommentTargetType.USER) return `/users/${targetId}`;
      return "/";
    }
    case NotificationType.QUEST_UPDATE: return `/quests/${data.questId as string}`;
    case NotificationType.INVITE: return data.guildId ? `/guilds/${data.guildId as string}` : `/quests/${data.questId as string}`;
    case NotificationType.BOOKING:
    case NotificationType.BOOKING_REQUESTED:
    case NotificationType.BOOKING_CONFIRMED:
    case NotificationType.BOOKING_CANCELLED:
      return data.bookingId ? `/bookings/${data.bookingId as string}` : "/work";
    default: return "/";
  }
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

// ─── Helper: Insert notification to DB ──────────────────────

async function insertNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  deepLinkUrl?: string;
  data?: Record<string, unknown>;
}) {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body || null,
    related_entity_type: params.relatedEntityType || null,
    related_entity_id: params.relatedEntityId || null,
    deep_link_url: params.deepLinkUrl || null,
    data: params.data as any || null,
  });
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

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    try {
      const saved = localStorage.getItem(`notif_prefs_${userId}`);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch { return DEFAULT_PREFS; }
  });

  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  const updatePreferences = useCallback((partial: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(`notif_prefs_${userId}`, JSON.stringify(next));
      prefsRef.current = next;
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

    await insertNotification(params);
    qc.invalidateQueries({ queryKey: ["notifications", params.userId] });

    // Only send browser push for current user's own notifications
    if (params.userId === userId && prefsRef.current.pushEnabled && prefsRef.current.notificationFrequency === "INSTANT") {
      sendBrowserNotification(params.title, params.body, params.deepLinkUrl);
    }
  }, [userId, qc]);

  // ── Trigger stubs — these insert into the DB notifications table ──

  const notifyComment = useCallback(async ({ commentAuthorId, targetType, targetId, commentId, commentSnippet }: any) => {
    if (commentAuthorId === userId) return; // Don't self-notify

    // Resolve the owner of the target entity
    let ownerUserId: string | null = null;
    try {
      if (targetType === "QUEST") {
        const { data } = await supabase.from("quests").select("owner_user_id").eq("id", targetId).maybeSingle();
        ownerUserId = data?.owner_user_id ?? null;
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
        ownerUserId = targetId; // Comment on a user's profile wall
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
      relatedEntityId: targetId,
      deepLinkUrl: buildCommentDeepLink(targetType, targetId),
      data: { targetType, targetId, commentId },
    });
  }, [userId, addNotification]);

  const notifyUpvote = useCallback(async ({ upvoterId, commentAuthorId, commentId, commentSnippet }: any) => {
    // Don't notify if upvoter is the comment author
    if (commentAuthorId === upvoterId) return;
    await addNotification({
      userId: commentAuthorId, type: NotificationType.UPVOTE,
      title: "Comment upvoted", body: `Someone upvoted your comment: "${(commentSnippet || "").slice(0, 60)}"`,
      relatedEntityType: NotificationEntityType.COMMENT, relatedEntityId: commentId,
      deepLinkUrl: "/notifications",
    });
  }, [addNotification]);

  const notifyQuestUpdate = useCallback(async ({ questId, questUpdateId, updateTitle }: any) => {
    // Check if current user is a participant
    const { data: participation } = await supabase.from("quest_participants").select("id").eq("quest_id", questId).eq("user_id", userId).maybeSingle();
    if (!participation) return;
    await addNotification({
      userId, type: NotificationType.QUEST_UPDATE,
      title: "Quest update", body: `New update: "${updateTitle}"`,
      relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
      deepLinkUrl: `/quests/${questId}#updates`,
    });
  }, [userId, addNotification]);

  const notifyBooking = useCallback(async ({ bookingId, serviceTitle, requesterName, recipientUserId, action, serviceId, requesterId }: any) => {
    // Don't notify yourself
    if (recipientUserId === userId && requesterId === userId) return;
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
  }, [userId, addNotification]);

  const notifyGuildMemberAdded = useCallback(async ({ guildId, userId: targetUserId }: any) => {
    if (targetUserId === userId) return; // don't self-notify the adder
    await addNotification({
      userId: targetUserId, type: NotificationType.GUILD_MEMBER_ADDED,
      title: "Added to guild", body: "You were added to a guild",
      relatedEntityType: NotificationEntityType.GUILD, relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
    });
  }, [userId, addNotification]);

  const notifyGuildRoleChanged = useCallback(async ({ guildId, userId: targetUserId, newRole }: any) => {
    if (targetUserId === userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.GUILD_ROLE_CHANGED,
      title: "Role changed", body: `Your guild role was changed to ${newRole}`,
      relatedEntityType: NotificationEntityType.GUILD, relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
    });
  }, [userId, addNotification]);

  const notifyGuildQuestCreated = useCallback(async ({ guildId, questId, questTitle }: any) => {
    // Notify guild admins (only current user if they're an admin)
    const { data: membership } = await supabase.from("guild_members").select("role").eq("guild_id", guildId).eq("user_id", userId).maybeSingle();
    if (membership?.role !== "ADMIN") return;
    await addNotification({
      userId, type: NotificationType.GUILD_QUEST_CREATED,
      title: "New guild quest", body: `Quest "${questTitle}" was created in your guild`,
      relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
      deepLinkUrl: `/quests/${questId}`,
    });
  }, [userId, addNotification]);

  const notifyPodInvite = useCallback(async ({ podId, userId: targetUserId }: any) => {
    if (targetUserId === userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.POD_CREATED,
      title: "Pod invitation", body: "You were invited to a pod",
      relatedEntityType: NotificationEntityType.POD, relatedEntityId: podId,
      deepLinkUrl: `/pods/${podId}`,
    });
  }, [userId, addNotification]);

  const notifyPodMessage = useCallback(async ({ podId, authorId, snippet }: any) => {
    if (authorId === userId) return;
    const { data: membership } = await supabase.from("pod_members").select("id").eq("pod_id", podId).eq("user_id", userId).maybeSingle();
    if (!membership) return;
    await addNotification({
      userId, type: NotificationType.POD_MESSAGE,
      title: "New pod message", body: `"${(snippet || "").slice(0, 60)}"`,
      relatedEntityType: NotificationEntityType.POD, relatedEntityId: podId,
      deepLinkUrl: `/pods/${podId}#chat`,
    });
  }, [userId, addNotification]);

  const notifyNewFollower = useCallback(async ({ followerId, targetUserId }: any) => {
    if (targetUserId !== userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.FOLLOWER_NEW,
      title: "New follower", body: "Someone started following you",
      relatedEntityType: NotificationEntityType.USER, relatedEntityId: followerId,
      deepLinkUrl: `/users/${followerId}`,
    });
  }, [userId, addNotification]);

  const notifyXpGained = useCallback(async ({ userId: targetUserId, amount, reason }: any) => {
    if (targetUserId !== userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.XP_GAINED,
      title: `+${amount} XP earned`, body: reason,
      relatedEntityType: NotificationEntityType.USER, relatedEntityId: targetUserId,
      deepLinkUrl: "/me",
    });
  }, [userId, addNotification]);

  const notifyAchievement = useCallback(async ({ userId: targetUserId, achievementTitle }: any) => {
    if (targetUserId !== userId) return;
    await addNotification({
      userId: targetUserId, type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: "Achievement unlocked!", body: achievementTitle,
      relatedEntityType: NotificationEntityType.ACHIEVEMENT, relatedEntityId: "",
      deepLinkUrl: "/me",
    });
  }, [userId, addNotification]);

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
