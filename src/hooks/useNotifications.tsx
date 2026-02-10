import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Notification } from "@/types";
import { NotificationType, NotificationEntityType, CommentTargetType } from "@/types/enums";
import {
  notifications as seedNotifications,
  guilds, quests, questUpdates, questParticipants,
  guildMembers, pods, podMembers, follows,
  getUserById, getServiceById,
} from "@/data/mock";
import { QuestParticipantStatus, GuildMemberRole, FollowTargetType } from "@/types/enums";
import {
  welcomeEmail, bookingRequestedEmail, bookingStatusEmail, sendEmail,
} from "@/services/emailTemplates";

// ─── Deep-link helpers ──────────────────────────────────────

function deepLinkForEntity(entityType: string, entityId: string, extra?: Record<string, string>): string {
  switch (entityType) {
    case NotificationEntityType.QUEST:
      return `/quests/${entityId}`;
    case NotificationEntityType.QUEST_UPDATE: {
      const qu = questUpdates.find((u) => u.id === entityId);
      return qu ? `/quests/${qu.questId}#updates` : "/";
    }
    case NotificationEntityType.COMMENT:
      return extra?.questId ? `/quests/${extra.questId}#comments` : "/";
    case NotificationEntityType.GUILD:
      return `/guilds/${entityId}`;
    case NotificationEntityType.POD:
      return extra?.chat ? `/pods/${entityId}#chat` : `/pods/${entityId}`;
    case NotificationEntityType.BOOKING:
      return `/bookings/${entityId}`;
    case NotificationEntityType.SERVICE:
      return `/services/${entityId}`;
    case NotificationEntityType.USER:
      return `/users/${entityId}`;
    case NotificationEntityType.ACHIEVEMENT:
      return "/me/achievements";
    case NotificationEntityType.SYSTEM:
      return "/";
    default:
      return "/";
  }
}

/** Legacy helper kept for backward compat */
export function linkForNotification(n: Notification): string {
  if (n.deepLinkUrl) return n.deepLinkUrl;
  // fallback for old-format notifications
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
    case NotificationType.QUEST_UPDATE:
      return `/quests/${data.questId as string}`;
    case NotificationType.INVITE:
      return data.guildId ? `/guilds/${data.guildId as string}` : `/quests/${data.questId as string}`;
    case NotificationType.BOOKING:
    case NotificationType.BOOKING_REQUESTED:
    case NotificationType.BOOKING_CONFIRMED:
    case NotificationType.BOOKING_CANCELLED:
      return data.bookingId ? `/bookings/${data.bookingId as string}` : "/work";
    default:
      return "/";
  }
}

// ─── Store interface ────────────────────────────────────────

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  // Triggers
  notifyComment: (params: {
    commentAuthorId: string;
    targetType: CommentTargetType;
    targetId: string;
    commentId: string;
    commentSnippet: string;
  }) => void;
  notifyUpvote: (params: {
    upvoterId: string;
    commentAuthorId: string;
    commentId: string;
    commentSnippet: string;
  }) => void;
  notifyQuestUpdate: (params: {
    questId: string;
    questUpdateId: string;
    updateTitle: string;
  }) => void;
  notifyBooking: (params: {
    bookingId: string;
    serviceTitle: string;
    requesterName: string;
    recipientUserId: string;
    action: string;
    serviceId?: string;
    requesterId?: string;
  }) => void;
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

// ─── Helpers ────────────────────────────────────────────────

function resolveOwnerForTarget(targetType: CommentTargetType, targetId: string): string | null {
  switch (targetType) {
    case CommentTargetType.GUILD:
      return guilds.find((g) => g.id === targetId)?.createdByUserId ?? null;
    case CommentTargetType.QUEST:
      return quests.find((q) => q.id === targetId)?.createdByUserId ?? null;
    case CommentTargetType.QUEST_UPDATE:
      return questUpdates.find((u) => u.id === targetId)?.authorId ?? null;
    case CommentTargetType.USER:
      return targetId;
    default:
      return null;
  }
}

function targetLabel(targetType: CommentTargetType, targetId: string): string {
  switch (targetType) {
    case CommentTargetType.GUILD:
      return guilds.find((g) => g.id === targetId)?.name ?? "a guild";
    case CommentTargetType.QUEST:
      return quests.find((q) => q.id === targetId)?.title ?? "a quest";
    case CommentTargetType.QUEST_UPDATE:
      return questUpdates.find((u) => u.id === targetId)?.title ?? "a quest update";
    case CommentTargetType.USER:
      return getUserById(targetId)?.name ? `${getUserById(targetId)!.name}'s profile` : "a profile";
    default:
      return "something";
  }
}

function commentTargetToEntityType(t: CommentTargetType): string {
  switch (t) {
    case CommentTargetType.GUILD: return NotificationEntityType.GUILD;
    case CommentTargetType.QUEST: return NotificationEntityType.QUEST;
    case CommentTargetType.QUEST_UPDATE: return NotificationEntityType.QUEST_UPDATE;
    case CommentTargetType.USER: return NotificationEntityType.USER;
    default: return NotificationEntityType.SYSTEM;
  }
}

function commentTargetToLink(targetType: CommentTargetType, targetId: string): string {
  switch (targetType) {
    case CommentTargetType.GUILD: return `/guilds/${targetId}`;
    case CommentTargetType.QUEST: return `/quests/${targetId}#comments`;
    case CommentTargetType.QUEST_UPDATE: {
      const qu = questUpdates.find((u) => u.id === targetId);
      return qu ? `/quests/${qu.questId}#comments` : "/";
    }
    case CommentTargetType.USER: return `/users/${targetId}`;
    default: return "/";
  }
}

// ─── Provider ───────────────────────────────────────────────

export function NotificationProvider({ children, currentUserId }: { children: ReactNode; currentUserId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>(
    () => seedNotifications.filter((n) => n.userId === currentUserId)
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id">) => {
    setNotifications((prev) => [
      { ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ...prev,
    ]);
  }, []);

  // ── Comment trigger ──
  const notifyComment = useCallback(({ commentAuthorId, targetType, targetId, commentId, commentSnippet }: {
    commentAuthorId: string; targetType: CommentTargetType; targetId: string; commentId: string; commentSnippet: string;
  }) => {
    const ownerId = resolveOwnerForTarget(targetType, targetId);
    if (!ownerId || ownerId === commentAuthorId || ownerId !== currentUserId) return;
    const authorName = getUserById(commentAuthorId)?.name ?? "Someone";
    const msg = `${authorName} commented on ${targetLabel(targetType, targetId)}`;
    addNotification({
      userId: ownerId,
      type: NotificationType.COMMENT,
      title: "New comment",
      body: `${msg}: "${commentSnippet.slice(0, 60)}"`,
      relatedEntityType: commentTargetToEntityType(targetType),
      relatedEntityId: targetId,
      deepLinkUrl: commentTargetToLink(targetType, targetId),
      isRead: false,
      createdAt: new Date().toISOString(),
      data: { commentId, targetType, targetId, message: msg },
    });
  }, [currentUserId, addNotification]);

  // ── Upvote trigger ──
  const notifyUpvote = useCallback(({ upvoterId, commentAuthorId, commentId, commentSnippet }: {
    upvoterId: string; commentAuthorId: string; commentId: string; commentSnippet: string;
  }) => {
    if (commentAuthorId === upvoterId || commentAuthorId !== currentUserId) return;
    const upvoterName = getUserById(upvoterId)?.name ?? "Someone";
    addNotification({
      userId: commentAuthorId,
      type: NotificationType.UPVOTE,
      title: "Comment upvoted",
      body: `${upvoterName} upvoted your comment: "${commentSnippet.slice(0, 60)}"`,
      relatedEntityType: NotificationEntityType.COMMENT,
      relatedEntityId: commentId,
      deepLinkUrl: "/notifications",
      isRead: false,
      createdAt: new Date().toISOString(),
      data: { commentId, targetType: CommentTargetType.QUEST, targetId: "", message: `${upvoterName} upvoted your comment` },
    });
  }, [currentUserId, addNotification]);

  // ── Quest update trigger ──
  const notifyQuestUpdate = useCallback(({ questId, questUpdateId, updateTitle }: {
    questId: string; questUpdateId: string; updateTitle: string;
  }) => {
    const participants = questParticipants.filter(
      (qp) => qp.questId === questId && qp.status === QuestParticipantStatus.ACCEPTED && qp.userId === currentUserId
    );
    for (const p of participants) {
      addNotification({
        userId: p.userId,
        type: NotificationType.QUEST_UPDATE,
        title: "Quest update",
        body: `New update on quest: "${updateTitle}"`,
        relatedEntityType: NotificationEntityType.QUEST,
        relatedEntityId: questId,
        deepLinkUrl: `/quests/${questId}#updates`,
        isRead: false,
        createdAt: new Date().toISOString(),
        data: { questId, questUpdateId, message: `New update on quest: "${updateTitle}"` },
      });
    }
  }, [currentUserId, addNotification]);

  // ── Booking trigger (upgraded) ──
  const notifyBooking = useCallback(({ bookingId, serviceTitle, requesterName, recipientUserId, action, serviceId, requesterId }: {
    bookingId: string; serviceTitle: string; requesterName: string; recipientUserId: string; action: string; serviceId?: string; requesterId?: string;
  }) => {
    const recipient = getUserById(recipientUserId);
    const service = serviceId ? getServiceById(serviceId) : undefined;
    if (recipient && service) {
      if (action === "requested" && requesterId) {
        const requester = getUserById(requesterId);
        if (requester) {
          sendEmail(bookingRequestedEmail(recipient, requester, service, { id: bookingId, serviceId: service.id, requesterId: requester.id, status: "REQUESTED" as any, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any));
        }
      } else if (action === "accepted" || action === "declined") {
        sendEmail(bookingStatusEmail(recipient, service, { id: bookingId, serviceId: service.id, requesterId: requesterId ?? "", status: action.toUpperCase() as any, createdAt: "", updatedAt: "" } as any, action.toUpperCase() as "ACCEPTED" | "DECLINED"));
      }
    }

    if (recipientUserId !== currentUserId) return;

    const typeMap: Record<string, NotificationType> = {
      requested: NotificationType.BOOKING_REQUESTED,
      confirmed: NotificationType.BOOKING_CONFIRMED,
      accepted: NotificationType.BOOKING_CONFIRMED,
      cancelled: NotificationType.BOOKING_CANCELLED,
      declined: NotificationType.BOOKING_CANCELLED,
    };
    const nType = typeMap[action] || NotificationType.BOOKING_UPDATED;

    const msg = action === "requested"
      ? `${requesterName} requested a session for "${serviceTitle}"`
      : `Your booking for "${serviceTitle}" was ${action}`;

    addNotification({
      userId: recipientUserId,
      type: nType,
      title: action === "requested" ? "New booking request" : `Booking ${action}`,
      body: msg,
      relatedEntityType: NotificationEntityType.BOOKING,
      relatedEntityId: bookingId,
      deepLinkUrl: `/bookings/${bookingId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      data: { bookingId, message: msg },
    });
  }, [currentUserId, addNotification]);

  // ── Guild member added ──
  const notifyGuildMemberAdded = useCallback(({ guildId, userId }: { guildId: string; userId: string }) => {
    if (userId !== currentUserId) return;
    const guild = guilds.find((g) => g.id === guildId);
    addNotification({
      userId,
      type: NotificationType.GUILD_MEMBER_ADDED,
      title: "Added to guild",
      body: `You were added to ${guild?.name ?? "a guild"}`,
      relatedEntityType: NotificationEntityType.GUILD,
      relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  // ── Guild role changed ──
  const notifyGuildRoleChanged = useCallback(({ guildId, userId, newRole }: { guildId: string; userId: string; newRole: string }) => {
    if (userId !== currentUserId) return;
    const guild = guilds.find((g) => g.id === guildId);
    addNotification({
      userId,
      type: NotificationType.GUILD_ROLE_CHANGED,
      title: "Role changed",
      body: `Your role in ${guild?.name ?? "a guild"} was changed to ${newRole}`,
      relatedEntityType: NotificationEntityType.GUILD,
      relatedEntityId: guildId,
      deepLinkUrl: `/guilds/${guildId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  // ── Guild quest created ──
  const notifyGuildQuestCreated = useCallback(({ guildId, questId, questTitle }: { guildId: string; questId: string; questTitle: string }) => {
    const admins = guildMembers.filter((gm) => gm.guildId === guildId && gm.role === GuildMemberRole.ADMIN && gm.userId === currentUserId);
    for (const admin of admins) {
      addNotification({
        userId: admin.userId,
        type: NotificationType.GUILD_QUEST_CREATED,
        title: "New guild quest",
        body: `Quest "${questTitle}" was created in your guild`,
        relatedEntityType: NotificationEntityType.QUEST,
        relatedEntityId: questId,
        deepLinkUrl: `/quests/${questId}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }
  }, [currentUserId, addNotification]);

  // ── Pod invite ──
  const notifyPodInvite = useCallback(({ podId, userId }: { podId: string; userId: string }) => {
    if (userId !== currentUserId) return;
    const pod = pods.find((p) => p.id === podId);
    addNotification({
      userId,
      type: NotificationType.POD_CREATED,
      title: "Pod invitation",
      body: `You were invited to pod "${pod?.name ?? "a pod"}"`,
      relatedEntityType: NotificationEntityType.POD,
      relatedEntityId: podId,
      deepLinkUrl: `/pods/${podId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  // ── Pod message ──
  const notifyPodMessage = useCallback(({ podId, authorId, snippet }: { podId: string; authorId: string; snippet: string }) => {
    if (authorId === currentUserId) return;
    const isMember = podMembers.some((pm) => pm.podId === podId && pm.userId === currentUserId);
    if (!isMember) return;
    const authorName = getUserById(authorId)?.name ?? "Someone";
    const pod = pods.find((p) => p.id === podId);
    addNotification({
      userId: currentUserId,
      type: NotificationType.POD_MESSAGE,
      title: "New pod message",
      body: `${authorName} in ${pod?.name ?? "a pod"}: "${snippet.slice(0, 60)}"`,
      relatedEntityType: NotificationEntityType.POD,
      relatedEntityId: podId,
      deepLinkUrl: `/pods/${podId}#chat`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  // ── New follower ──
  const notifyNewFollower = useCallback(({ followerId, targetUserId }: { followerId: string; targetUserId: string }) => {
    if (targetUserId !== currentUserId) return;
    const followerName = getUserById(followerId)?.name ?? "Someone";
    addNotification({
      userId: targetUserId,
      type: NotificationType.FOLLOWER_NEW,
      title: "New follower",
      body: `${followerName} started following you`,
      relatedEntityType: NotificationEntityType.USER,
      relatedEntityId: followerId,
      deepLinkUrl: `/users/${followerId}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  // ── XP gained ──
  const notifyXpGained = useCallback(({ userId, amount, reason }: { userId: string; amount: number; reason: string }) => {
    if (userId !== currentUserId) return;
    addNotification({
      userId,
      type: NotificationType.XP_GAINED,
      title: `+${amount} XP earned`,
      body: reason,
      relatedEntityType: NotificationEntityType.USER,
      relatedEntityId: userId,
      deepLinkUrl: "/me",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  // ── Achievement unlocked ──
  const notifyAchievement = useCallback(({ userId, achievementTitle }: { userId: string; achievementTitle: string }) => {
    if (userId !== currentUserId) return;
    addNotification({
      userId,
      type: NotificationType.ACHIEVEMENT_UNLOCKED,
      title: "Achievement unlocked!",
      body: achievementTitle,
      relatedEntityType: NotificationEntityType.ACHIEVEMENT,
      relatedEntityId: "",
      deepLinkUrl: "/me/achievements",
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }, [currentUserId, addNotification]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, markAsRead, markAllAsRead,
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
