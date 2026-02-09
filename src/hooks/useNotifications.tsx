import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Notification } from "@/types";
import { NotificationType, CommentTargetType } from "@/types/enums";
import {
  notifications as seedNotifications,
  guilds, quests, questUpdates, questParticipants,
  getUserById,
} from "@/data/mock";
import { QuestParticipantStatus } from "@/types/enums";

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
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
  }) => void;
}

const NotificationContext = createContext<NotificationStore>(null!);

function resolveOwnerForTarget(targetType: CommentTargetType, targetId: string): string | null {
  switch (targetType) {
    case CommentTargetType.GUILD: {
      const guild = guilds.find((g) => g.id === targetId);
      return guild?.createdByUserId ?? null;
    }
    case CommentTargetType.QUEST: {
      const quest = quests.find((q) => q.id === targetId);
      return quest?.createdByUserId ?? null;
    }
    case CommentTargetType.QUEST_UPDATE: {
      const qu = questUpdates.find((u) => u.id === targetId);
      return qu?.authorId ?? null;
    }
    case CommentTargetType.USER:
      return targetId; // the profile owner
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
    case CommentTargetType.USER: {
      const u = getUserById(targetId);
      return u ? `${u.name}'s profile` : "a profile";
    }
    default:
      return "something";
  }
}

function linkForTarget(targetType: CommentTargetType, targetId: string): string {
  switch (targetType) {
    case CommentTargetType.GUILD:
      return `/guilds/${targetId}`;
    case CommentTargetType.QUEST:
      return `/quests/${targetId}`;
    case CommentTargetType.QUEST_UPDATE: {
      const qu = questUpdates.find((u) => u.id === targetId);
      return qu ? `/quests/${qu.questId}` : "/";
    }
    case CommentTargetType.USER:
      return `/users/${targetId}`;
    default:
      return "/";
  }
}

export function linkForNotification(n: Notification): string {
  const data = n.data as Record<string, unknown>;
  switch (n.type) {
    case NotificationType.COMMENT:
      return linkForTarget(data.targetType as CommentTargetType, data.targetId as string);
    case NotificationType.UPVOTE:
      return linkForTarget(data.targetType as CommentTargetType, data.targetId as string);
    case NotificationType.QUEST_UPDATE:
      return `/quests/${data.questId as string}`;
    case NotificationType.INVITE:
      return data.guildId ? `/guilds/${data.guildId as string}` : `/quests/${data.questId as string}`;
    default:
      return "/";
  }
}

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
    if (n.userId === currentUserId) {
      // don't notify yourself
      // Actually we DO store it — the user IS the recipient
    }
    setNotifications((prev) => [{ ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }, ...prev]);
  }, [currentUserId]);

  const notifyComment = useCallback(({ commentAuthorId, targetType, targetId, commentId, commentSnippet }: {
    commentAuthorId: string; targetType: CommentTargetType; targetId: string; commentId: string; commentSnippet: string;
  }) => {
    const ownerId = resolveOwnerForTarget(targetType, targetId);
    if (!ownerId || ownerId === commentAuthorId) return;
    if (ownerId !== currentUserId) return; // only store for current user in mock
    const authorName = getUserById(commentAuthorId)?.name ?? "Someone";
    addNotification({
      userId: ownerId,
      type: NotificationType.COMMENT,
      data: {
        commentId,
        targetType,
        targetId,
        message: `${authorName} commented on ${targetLabel(targetType, targetId)}: "${commentSnippet.slice(0, 60)}"`,
      },
      isRead: false,
    });
  }, [currentUserId, addNotification]);

  const notifyUpvote = useCallback(({ upvoterId, commentAuthorId, commentId, commentSnippet }: {
    upvoterId: string; commentAuthorId: string; commentId: string; commentSnippet: string;
  }) => {
    if (commentAuthorId === upvoterId) return;
    if (commentAuthorId !== currentUserId) return;
    const upvoterName = getUserById(upvoterId)?.name ?? "Someone";
    addNotification({
      userId: commentAuthorId,
      type: NotificationType.UPVOTE,
      data: {
        commentId,
        targetType: CommentTargetType.QUEST, // generic
        targetId: "",
        message: `${upvoterName} upvoted your comment: "${commentSnippet.slice(0, 60)}"`,
      },
      isRead: false,
    });
  }, [currentUserId, addNotification]);

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
        data: { questId, questUpdateId, message: `New update on quest: "${updateTitle}"` },
        isRead: false,
      });
    }
  }, [currentUserId, addNotification]);

  const notifyBooking = useCallback(({ bookingId, serviceTitle, requesterName, recipientUserId, action }: {
    bookingId: string; serviceTitle: string; requesterName: string; recipientUserId: string; action: string;
  }) => {
    if (recipientUserId !== currentUserId) return;
    addNotification({
      userId: recipientUserId,
      type: NotificationType.BOOKING,
      data: {
        bookingId,
        message: action === "requested"
          ? `${requesterName} requested a session for "${serviceTitle}"`
          : `Your booking for "${serviceTitle}" was ${action}`,
      },
      isRead: false,
    });
  }, [currentUserId, addNotification]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, notifyComment, notifyUpvote, notifyQuestUpdate, notifyBooking }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
