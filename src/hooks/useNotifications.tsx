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
    case NotificationType.POST_UPVOTED:
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
    case NotificationType.APPLICATION_APPROVED:
    case NotificationType.APPLICATION_REJECTED:
    case NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST:
    case NotificationType.UNIT_NEW_POD_JOIN_REQUEST:
    case NotificationType.ENTITY_NEW_DECISION:
    case NotificationType.ENTITY_NEW_RITUAL:
    case NotificationType.BULK_MENTION_MEMBERS:
    case NotificationType.BULK_MENTION_FOLLOWERS:
      return "notifyOnGuildActivity";
    case NotificationType.FOLLOWER_NEW:
    case NotificationType.FOLLOWER_ACTIVITY:
      return "notifyOnFollowerActivity";
    case NotificationType.XP_GAINED:
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return "notifyOnXpAndAchievements";
    case NotificationType.FOLLOWED_USER_NEW_POST:
    case NotificationType.FOLLOWED_ENTITY_NEW_POST:
      return "notifyOnFollowerActivity"; // mapped to follower activity for legacy compat
    case NotificationType.DIRECT_MESSAGE_RECEIVED:
    case NotificationType.MESSAGE_PRIVATE:
      return "notifyOnPodMessages";
    case NotificationType.CONTRIBUTION_LOGGED:
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
      return data.guildId ? `/guilds/${data.guildId as string}` : (n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "GUILD", n.relatedEntityId) : "/");
    case NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST:
      return n.relatedEntityId ? `/guilds/${n.relatedEntityId}/settings?tab=applications` : "/";
    case NotificationType.POD_CREATED:
    case NotificationType.POD_MESSAGE:
      return `/pods/${(data.podId as string) || n.relatedEntityId || ""}`;
    case NotificationType.UNIT_NEW_POD_JOIN_REQUEST:
      return n.relatedEntityId ? `/pods/${n.relatedEntityId}/settings?tab=applications` : "/";
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
      return "/me";
    case NotificationType.ACHIEVEMENT_UNLOCKED:
      return n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "ACHIEVEMENT", n.relatedEntityId) : "/me/milestones";
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
    case NotificationType.FOLLOWED_USER_NEW_POST:
    case NotificationType.FOLLOWED_ENTITY_NEW_POST:
      return n.relatedEntityId ? `/` : "/feed";
    case NotificationType.FOLLOWED_ENTITY_NEW_EVENT:
      return n.relatedEntityId ? `/events/${n.relatedEntityId}` : "/explore";
    case NotificationType.FOLLOWED_ENTITY_NEW_SERVICE:
      return n.relatedEntityId ? `/services/${n.relatedEntityId}` : "/explore";
    case NotificationType.FOLLOWED_ENTITY_NEW_COURSE:
      return n.relatedEntityId ? `/courses/${n.relatedEntityId}` : "/explore";
    case NotificationType.FOLLOWED_ENTITY_NEW_QUEST:
      return n.relatedEntityId ? `/quests/${n.relatedEntityId}` : "/explore";
    case NotificationType.FOLLOWED_ENTITY_UPDATE:
      return n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "GUILD", n.relatedEntityId) : "/network";
    case NotificationType.FOLLOWED_ENTITY_NEW_MEMBER:
      return n.relatedEntityId ? buildNotifDeepLink(n.relatedEntityType || "GUILD", n.relatedEntityId) : "/network";
    case NotificationType.DIRECT_MESSAGE_RECEIVED:
      return n.relatedEntityId ? `/inbox` : "/inbox";
    default: {
      // Handle milestone_completed and other non-enum types
      const typeStr = n.type as string;
      if (typeStr === "milestone_completed") return "/me/milestones";
      break;
    }
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
  notifyFollowersQuestCreated: (params: { questId: string; questTitle: string }) => void;
  notifyPodInvite: (params: { podId: string; userId: string }) => void;
  notifyPodMessage: (params: { podId: string; authorId: string; snippet: string }) => void;
  notifyNewFollower: (params: { followerId: string; targetUserId: string }) => void;
  notifyXpGained: (params: { userId: string; amount: number; reason: string }) => void;
  notifyAchievement: (params: { userId: string; achievementTitle: string }) => void;
  notifyPostUpvote: (params: { postId: string; postAuthorId: string; upvoterName: string }) => void;
  notifyJoinRequest: (params: { entityType: string; entityId: string; entityName: string; applicantName: string }) => void;
  notifyApplicationDecision: (params: { entityType: string; entityId: string; entityName: string; applicantUserId: string; decision: "APPROVED" | "REJECTED" }) => void;
  notifyDecisionCreated: (params: { entityType: string; entityId: string; entityName: string; question: string; creatorUserId: string }) => void;
  notifyRitualCreated: (params: { entityType: string; entityId: string; entityName: string; ritualTitle: string; creatorUserId: string }) => void;
  notifyBulkMention: (params: { mentionType: "members" | "followers"; entityType: string; entityId: string; authorUserId: string; authorName: string; snippet: string; targetType: string; targetId: string }) => void;
  notifyFollowedEntityNewPost: (params: { entityType: string; entityId: string; entityName: string; postId: string; authorUserId: string; authorName?: string; roomId?: string; roomName?: string; deepLinkUrl?: string; body?: string }) => void;
  notifyContributionLogged: (params: { contributorUserId: string; questTitle: string; amount: number; unit: string; entityName: string }) => void;
}

const NotificationContext = createContext<NotificationStore>(null!);

// ─── Helper: Build deep link for entity ─────────────────────

function buildNotifDeepLink(targetType: string, targetId: string): string {
  switch (targetType) {
    case "QUEST": return `/quests/${targetId}`;
    case "QUEST_UPDATE": return `/quests/${targetId}`;
    case "SERVICE": return `/services/${targetId}`;
    case "GUILD": return `/guilds/${targetId}`;
    case "POD": return `/pods/${targetId}`;
    case "COMPANY": return `/companies/${targetId}`;
    case "COURSE": return `/courses/${targetId}`;
    case "USER": return `/users/${targetId}`;
    case "GUILD_EVENT": return `/events/${targetId}`;
    case "BOOKING": return `/bookings/${targetId}`;
    case "ACHIEVEMENT": return `/me/milestones`;
    case "milestone": return `/me/milestones`;
    case "TERRITORY": return `/territories/${targetId}`;
    case "FEED_POST": return `/`; // feed posts don't have individual pages
    case "COMMENT": return `/notifications`; // comments don't have standalone pages
    default: return `/notifications`;
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
    notify_guild_activity: local.notifyOnGuildActivity,
    notify_pod_messages: local.notifyOnPodMessages,
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
    notifyOnGuildActivity: row.notify_guild_activity as boolean ?? true,
    notifyOnPodMessages: row.notify_pod_messages as boolean ?? true,
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
    refetchInterval: 60000,
  });

  // ── Realtime subscription for instant notification updates ──
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

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
    // Optimistic update
    qc.setQueryData(["notifications", userId], (old: Notification[] | undefined) =>
      (old ?? []).map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) console.error("[Notifications] markAsRead failed:", error.message);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }, [userId, qc]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    qc.setQueryData(["notifications", userId], (old: Notification[] | undefined) =>
      (old ?? []).map((n) => ({ ...n, isRead: true }))
    );
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) console.error("[Notifications] markAllAsRead failed:", error.message);
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

  // ── Helper: resolve actor name ──
  const resolveActorName = useCallback(async (actorUserId: string): Promise<string> => {
    try {
      const { data } = await supabase.from("profiles_public").select("name").eq("user_id", actorUserId).maybeSingle();
      return data?.name || "Someone";
    } catch { return "Someone"; }
  }, []);

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
        // Notify ALL guild admins, not just one
        const { data: admins } = await supabase.from("guild_members").select("user_id").eq("guild_id", targetId).eq("role", "ADMIN").limit(10);
        const actorName = await resolveActorName(commentAuthorId);
        const truncated = (commentSnippet || "").slice(0, 60);
        for (const admin of admins ?? []) {
          if (admin.user_id === commentAuthorId) continue;
          await addNotification({
            userId: admin.user_id,
            type: NotificationType.COMMENT,
            title: "New comment",
            body: `${actorName} commented on your guild: "${truncated}"`,
            relatedEntityType: targetType,
            relatedEntityId: commentId,
            deepLinkUrl: buildNotifDeepLink(targetType, targetId),
            data: { targetType, targetId, commentId },
          });
        }
        return; // handled, skip single-owner path
      } else if (targetType === "POD") {
        const { data: podAdmins } = await supabase.from("pod_members" as any).select("user_id").eq("pod_id", targetId).eq("role", "HOST").limit(5);
        ownerUserId = (podAdmins as any)?.[0]?.user_id ?? null;
      } else if (targetType === "GUILD_EVENT" || targetType === "EVENT") {
        const { data: evData } = await supabase.from("guild_events" as any).select("created_by_user_id").eq("id", targetId).maybeSingle();
        ownerUserId = (evData as any)?.created_by_user_id ?? null;
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

    const actorName = await resolveActorName(commentAuthorId);
    const truncated = (commentSnippet || "").slice(0, 60);
    const entityLabel = targetType.toLowerCase().replace(/_/g, " ");

    await addNotification({
      userId: ownerUserId,
      type: NotificationType.COMMENT,
      title: "New comment",
      body: `${actorName} commented on your ${entityLabel}: "${truncated}"`,
      relatedEntityType: targetType,
      relatedEntityId: commentId,
      deepLinkUrl: buildNotifDeepLink(targetType, targetId),
      data: { targetType, targetId, commentId },
    });
  }, [userId, addNotification, resolveActorName]);

  // ── Trigger: Comment upvote ──

  const notifyUpvote = useCallback(async ({ upvoterId, commentAuthorId, commentId, commentSnippet }: any) => {
    if (commentAuthorId === upvoterId) return;
    const actorName = await resolveActorName(upvoterId);
    await addNotification({
      userId: commentAuthorId, type: NotificationType.UPVOTE,
      title: "Comment upvoted", body: `${actorName} upvoted your comment: "${(commentSnippet || "").slice(0, 60)}"`,
      relatedEntityType: NotificationEntityType.COMMENT, relatedEntityId: commentId,
      deepLinkUrl: "/notifications",
    });
  }, [addNotification, resolveActorName]);

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
    let guildName = "a guild";
    try {
      const { data } = await supabase.from("guilds").select("name").eq("id", guildId).maybeSingle();
      if (data?.name) guildName = data.name;
    } catch { /* silent */ }
    await addNotification({
      userId: targetUserId, type: NotificationType.GUILD_MEMBER_ADDED,
      title: "Added to guild", body: `You were added to ${guildName}`,
      relatedEntityType: NotificationEntityType.GUILD, relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
    });
  }, [userId, addNotification]);

  // ── Trigger: Guild role changed ──

  const notifyGuildRoleChanged = useCallback(async ({ guildId, userId: targetUserId, newRole }: any) => {
    if (targetUserId === userId) return;
    let guildName = "your guild";
    try {
      const { data } = await supabase.from("guilds").select("name").eq("id", guildId).maybeSingle();
      if (data?.name) guildName = data.name;
    } catch { /* silent */ }
    await addNotification({
      userId: targetUserId, type: NotificationType.GUILD_ROLE_CHANGED,
      title: "Role changed", body: `Your role in ${guildName} was changed to ${newRole}`,
      relatedEntityType: NotificationEntityType.GUILD, relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
    });
  }, [userId, addNotification]);

  // ── Trigger: Guild quest created — notify ALL guild members + creator's followers ──

  const notifyGuildQuestCreated = useCallback(async ({ guildId, questId, questTitle }: any) => {
    try {
      const notifiedSet = new Set<string>();

      // 1. Notify all guild members (not just admins)
      const { data: members } = await supabase
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", guildId);

      for (const m of members ?? []) {
        if (m.user_id === userId) continue;
        if (notifiedSet.has(m.user_id)) continue;
        notifiedSet.add(m.user_id);
        await addNotification({
          userId: m.user_id, type: NotificationType.GUILD_QUEST_CREATED,
          title: "New guild quest", body: `Quest "${questTitle}" was created in your guild`,
          relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
          deepLinkUrl: `/quests/${questId}`,
        });
      }

      // 2. Notify followers of the quest creator
      if (userId) {
        const { data: followers } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("target_type", "USER")
          .eq("target_id", userId);

        for (const f of followers ?? []) {
          if (f.follower_id === userId) continue;
          if (notifiedSet.has(f.follower_id)) continue;
          notifiedSet.add(f.follower_id);
          await addNotification({
            userId: f.follower_id, type: NotificationType.QUEST_CREATED,
            title: "New quest from someone you follow",
            body: `A new quest "${questTitle}" was created`,
            relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
            deepLinkUrl: `/quests/${questId}`,
          });
        }
      }
    } catch (err) {
      console.error("[Notifications] notifyGuildQuestCreated error:", err);
    }
  }, [userId, addNotification]);

  // ── Trigger: Pod invite ──

  const notifyPodInvite = useCallback(async ({ podId, userId: targetUserId }: any) => {
    if (targetUserId === userId) return;
    let podName = "a pod";
    try {
      const { data } = await supabase.from("pods").select("name").eq("id", podId).maybeSingle();
      if (data?.name) podName = data.name;
    } catch { /* silent */ }
    await addNotification({
      userId: targetUserId, type: NotificationType.USER_INVITED_TO_UNIT,
      title: "Pod invitation", body: `You were invited to ${podName}`,
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
    const actorName = await resolveActorName(followerId);
    await addNotification({
      userId: targetUserId, type: NotificationType.FOLLOWER_NEW,
      title: "New follower", body: `${actorName} started following you`,
      relatedEntityType: NotificationEntityType.USER, relatedEntityId: followerId,
      deepLinkUrl: `/users/${followerId}`,
    });
  }, [addNotification, resolveActorName]);

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

  const notifyAchievement = useCallback(async ({ userId: targetUserId, achievementTitle, relatedEntityType, relatedEntityId, deepLinkUrl }: any) => {
    await addNotification({
      userId: targetUserId, type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: "Achievement unlocked!", body: achievementTitle,
      relatedEntityType: relatedEntityType || NotificationEntityType.ACHIEVEMENT,
      relatedEntityId: relatedEntityId || "",
      deepLinkUrl: deepLinkUrl || "/me/milestones",
    });
  }, [addNotification]);

  // ── Trigger: Post upvoted — notify post author ──

  const notifyPostUpvote = useCallback(async ({ postId, postAuthorId, upvoterName }: any) => {
    if (postAuthorId === userId) return;
    await addNotification({
      userId: postAuthorId, type: NotificationType.POST_UPVOTED,
      title: "Your post was upvoted", body: `${upvoterName || "Someone"} upvoted your post`,
      relatedEntityType: "FEED_POST", relatedEntityId: postId,
      deepLinkUrl: `/feed?post=${postId}`,
    });
  }, [userId, addNotification]);

  // ── Trigger: Join request — notify entity admins ──

  const notifyJoinRequest = useCallback(async ({ entityType, entityId, entityName, applicantName }: any) => {
    const adminIds: string[] = [];
    try {
      if (entityType === "guild") {
        const { data } = await supabase.from("guild_members").select("user_id").eq("guild_id", entityId).eq("role", "ADMIN");
        (data ?? []).forEach((r: any) => adminIds.push(r.user_id));
      } else if (entityType === "company") {
        const { data } = await supabase.from("company_members").select("user_id").eq("company_id", entityId).in("role", ["admin", "owner", "ADMIN"]);
        (data ?? []).forEach((r: any) => adminIds.push(r.user_id));
      } else if (entityType === "pod") {
        const { data } = await supabase.from("pod_members").select("user_id").eq("pod_id", entityId).eq("role", "HOST");
        (data ?? []).forEach((r: any) => adminIds.push(r.user_id));
      }
    } catch { /* silent */ }

    const notifType = entityType === "pod" ? NotificationType.UNIT_NEW_POD_JOIN_REQUEST : NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST;
    // Route to the members tab where applications are shown
    const deepLink = `/${entityType === "company" ? "companies" : entityType + "s"}/${entityId}?tab=members`;

    for (const adminId of adminIds) {
      if (adminId === userId) continue;
      await addNotification({
        userId: adminId, type: notifType,
        title: `New join request for ${entityName}`,
        body: `${applicantName} wants to join ${entityName}`,
        relatedEntityType: entityType.toUpperCase(), relatedEntityId: entityId,
        deepLinkUrl: deepLink,
      });
    }
  }, [userId, addNotification]);

  // ── Trigger: Application decision — notify applicant ──

  const notifyApplicationDecision = useCallback(async ({ entityType, entityId, entityName, applicantUserId, decision }: any) => {
    if (applicantUserId === userId) return;
    const approved = decision === "APPROVED";
    const deepLink = `/${entityType === "company" ? "companies" : entityType + "s"}/${entityId}`;
    await addNotification({
      userId: applicantUserId,
      type: approved ? NotificationType.APPLICATION_APPROVED : NotificationType.APPLICATION_REJECTED,
      title: approved ? "Application approved!" : "Application not accepted",
      body: approved ? `Your application to join ${entityName} was approved` : `Your application to join ${entityName} was not accepted`,
      relatedEntityType: entityType.toUpperCase(), relatedEntityId: entityId,
      deepLinkUrl: deepLink,
    });
  }, [userId, addNotification]);

  // ── Trigger: Decision created — notify entity members via addNotification ──

  const notifyDecisionCreated = useCallback(async ({ entityType, entityId, entityName, question, creatorUserId, decisionId }: any) => {
    try {
      const memberTable = entityType === "GUILD" ? "guild_members" : entityType === "COMPANY" ? "company_members" : null;
      const idCol = entityType === "GUILD" ? "guild_id" : entityType === "COMPANY" ? "company_id" : null;
      if (!memberTable || !idCol) return;

      const { data: members } = await supabase.from(memberTable as any).select("user_id").eq(idCol, entityId).limit(200);
      if (!members?.length) return;

      const dId = decisionId || entityId;
      const deepLink = `/${entityType === "COMPANY" ? "companies" : "guilds"}/${entityId}?tab=decisions&decision=${dId}`;
      const truncQ = question.length > 60 ? question.slice(0, 57) + "…" : question;
      const targets = (members as any[]).filter((m: any) => m.user_id !== creatorUserId);

      for (let i = 0; i < targets.length; i++) {
        await addNotification({
          userId: targets[i].user_id,
          type: NotificationType.ENTITY_NEW_DECISION,
          title: `New decision in ${entityName}`,
          body: `"${truncQ}"`,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          deepLinkUrl: deepLink,
        });
        if (targets.length > 200 && i % 10 === 9) await new Promise(r => setTimeout(r, 10));
      }
    } catch (err) {
      console.error("[Notifications] notifyDecisionCreated error:", err);
    }
  }, [addNotification]);

  // ── Trigger: Ritual created — notify entity members via addNotification ──

  const notifyRitualCreated = useCallback(async ({ entityType, entityId, entityName, ritualTitle, creatorUserId }: any) => {
    try {
      const memberTable = entityType === "GUILD" ? "guild_members" : null;
      const idCol = entityType === "GUILD" ? "guild_id" : null;
      if (!memberTable || !idCol) return;

      const { data: members } = await supabase.from(memberTable as any).select("user_id").eq(idCol, entityId).limit(200);
      if (!members?.length) return;

      const deepLink = `/${entityType === "COMPANY" ? "companies" : "guilds"}/${entityId}?tab=rituals`;
      const targets = (members as any[]).filter((m: any) => m.user_id !== creatorUserId);

      for (let i = 0; i < targets.length; i++) {
        await addNotification({
          userId: targets[i].user_id,
          type: NotificationType.ENTITY_NEW_RITUAL,
          title: `New ritual in ${entityName}`,
          body: `"${ritualTitle}"`,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
          deepLinkUrl: deepLink,
        });
        if (targets.length > 200 && i % 10 === 9) await new Promise(r => setTimeout(r, 10));
      }
    } catch (err) {
      console.error("[Notifications] notifyRitualCreated error:", err);
    }
  }, [addNotification]);

  // ── Trigger: Bulk @members / @followers mention via addNotification ──

  const notifyBulkMention = useCallback(async ({ mentionType, entityType, entityId, authorUserId, authorName, snippet, targetType, targetId }: any) => {
    try {
      const userIds: string[] = [];

      if (mentionType === "members") {
        const TABLES: Record<string, { table: string; col: string }> = {
          GUILD: { table: "guild_members", col: "guild_id" },
          COMPANY: { table: "company_members", col: "company_id" },
          QUEST: { table: "quest_participants", col: "quest_id" },
          POD: { table: "pod_members", col: "pod_id" },
        };
        const cfg = TABLES[entityType];
        if (!cfg) return;
        const { data } = await supabase.from(cfg.table as any).select("user_id").eq(cfg.col, entityId).limit(500);
        (data ?? []).forEach((r: any) => { if (r.user_id !== authorUserId) userIds.push(r.user_id); });
      } else {
        const { data } = await supabase.from("follows").select("follower_id").eq("target_type", entityType).eq("target_id", entityId).limit(500);
        (data ?? []).forEach((r: any) => { if (r.follower_id !== authorUserId) userIds.push(r.follower_id); });
      }

      const uniqueIds = [...new Set(userIds)];
      if (uniqueIds.length === 0) return;

      const truncSnippet = snippet.length > 60 ? snippet.slice(0, 57) + "…" : snippet;
      const deepLink = buildNotifDeepLink(targetType, targetId);
      const notifType = mentionType === "members" ? NotificationType.BULK_MENTION_MEMBERS : NotificationType.BULK_MENTION_FOLLOWERS;

      for (let i = 0; i < uniqueIds.length; i++) {
        await addNotification({
          userId: uniqueIds[i],
          type: notifType,
          title: mentionType === "members" ? "All members were mentioned" : "All followers were mentioned",
          body: `${authorName} mentioned @${mentionType} in a comment: "${truncSnippet}"`,
          relatedEntityType: targetType,
          relatedEntityId: targetId,
          deepLinkUrl: deepLink,
          
        });
        if (uniqueIds.length > 200 && i % 10 === 9) await new Promise(r => setTimeout(r, 10));
      }
    } catch (err) {
      console.error("[Notifications] notifyBulkMention error:", err);
    }
  }, [addNotification]);

  // ── Trigger: Notify followers of quest creator (no guild context) ──

  const notifyFollowersQuestCreated = useCallback(async ({ questId, questTitle }: any) => {
    try {
      if (!userId) return;
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("target_type", "USER")
        .eq("target_id", userId);

      for (const f of followers ?? []) {
        if (f.follower_id === userId) continue;
        await addNotification({
          userId: f.follower_id, type: NotificationType.QUEST_CREATED,
          title: "New quest from someone you follow",
          body: `A new quest "${questTitle}" was created`,
          relatedEntityType: NotificationEntityType.QUEST, relatedEntityId: questId,
          deepLinkUrl: `/quests/${questId}`,
        });
      }
    } catch (err) {
      console.error("[Notifications] notifyFollowersQuestCreated error:", err);
    }
  }, [userId, addNotification]);

  // ── Trigger: New post in followed entity — notify members + followers ──

  const notifyFollowedEntityNewPost = useCallback(async ({ entityType, entityId, entityName, postId, authorUserId }: { entityType: string; entityId: string; entityName: string; postId: string; authorUserId: string }) => {
    try {
      const notifiedSet = new Set<string>();

      // 1. Notify entity members
      const tableCfg: Record<string, { table: string; col: string }> = {
        GUILD: { table: "guild_members", col: "guild_id" },
        COMPANY: { table: "company_members", col: "company_id" },
      };
      const cfg = tableCfg[entityType];
      if (cfg) {
        const { data: members } = await supabase.from(cfg.table as any).select("user_id").eq(cfg.col, entityId).limit(200);
        for (const m of (members ?? []) as any[]) {
          if (m.user_id === authorUserId) continue;
          notifiedSet.add(m.user_id);
          await addNotification({ userId: m.user_id, type: NotificationType.FOLLOWED_ENTITY_NEW_POST, title: `New post in ${entityName}`, body: `Someone posted in ${entityName}`, relatedEntityType: entityType as any, relatedEntityId: postId, deepLinkUrl: `/` });
        }
      }

      // 2. Notify followers of the entity
      const { data: followers } = await supabase.from("follows").select("follower_id").eq("target_type", entityType).eq("target_id", entityId).limit(500);
      for (const f of followers ?? []) {
        if (f.follower_id === authorUserId || notifiedSet.has(f.follower_id)) continue;
        notifiedSet.add(f.follower_id);
        await addNotification({ userId: f.follower_id, type: NotificationType.FOLLOWED_ENTITY_NEW_POST, title: `New post in ${entityName}`, body: `New activity in a community you follow`, relatedEntityType: entityType as any, relatedEntityId: postId, deepLinkUrl: `/` });
      }
    } catch (err) {
      console.error("[Notifications] notifyFollowedEntityNewPost:", err);
    }
  }, [userId, addNotification]);

  // ── Trigger: Contribution logged for another user ──

  const notifyContributionLogged = useCallback(async ({ contributorUserId, questTitle, amount, unit, entityName }: any) => {
    if (contributorUserId === userId) return;
    await addNotification({
      userId: contributorUserId,
      type: NotificationType.CONTRIBUTION_LOGGED,
      title: "Contribution recorded",
      body: `${amount} ${unit} logged for "${questTitle}" in ${entityName}`,
      relatedEntityType: "GUILD",
      relatedEntityId: entityName,
      deepLinkUrl: "/me?tab=contributions",
    });
  }, [userId, addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications: dbNotifications, unreadCount, markAsRead, markAllAsRead,
      preferences, updatePreferences,
      notifyComment, notifyUpvote, notifyQuestUpdate, notifyBooking,
      notifyGuildMemberAdded, notifyGuildRoleChanged, notifyGuildQuestCreated,
      notifyFollowersQuestCreated,
      notifyPodInvite, notifyPodMessage, notifyNewFollower,
      notifyXpGained, notifyAchievement,
      notifyPostUpvote, notifyJoinRequest, notifyApplicationDecision,
      notifyDecisionCreated, notifyRitualCreated, notifyBulkMention,
      notifyFollowedEntityNewPost,
      notifyContributionLogged,
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
