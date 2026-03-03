import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Bell, Check, CheckCheck, MessageSquare, ThumbsUp, Users, Megaphone,
  CalendarCheck, UserPlus, Zap, Trophy, Shield, Radio, ChevronDown,
  Filter, AlertTriangle, CreditCard, Bug, Flag, Building2, Handshake,
  GraduationCap, Calendar, Brain, Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useNotifications, linkForNotification } from "@/hooks/useNotifications";
import { useUserRoles } from "@/lib/admin";
import { useAuth } from "@/hooks/useAuth";
import { NotificationType } from "@/types/enums";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { translateNotificationTitle, translateNotificationBody } from "@/lib/notificationTranslation";

const typeIcons: Record<string, typeof MessageSquare> = {
  [NotificationType.COMMENT]: MessageSquare,
  [NotificationType.QUEST_COMMENT]: MessageSquare,
  [NotificationType.UPVOTE]: ThumbsUp,
  [NotificationType.QUEST_UPVOTE]: ThumbsUp,
  [NotificationType.INVITE]: Users,
  [NotificationType.QUEST_UPDATE]: Megaphone,
  [NotificationType.QUEST_CREATED]: Megaphone,
  [NotificationType.QUEST_UPDATED]: Megaphone,
  [NotificationType.QUEST_COMPLETED]: Trophy,
  [NotificationType.GUILD_MEMBER_ADDED]: UserPlus,
  [NotificationType.GUILD_ROLE_CHANGED]: Shield,
  [NotificationType.GUILD_QUEST_CREATED]: Megaphone,
  [NotificationType.POD_CREATED]: Radio,
  [NotificationType.POD_MESSAGE]: MessageSquare,
  [NotificationType.BOOKING]: CalendarCheck,
  [NotificationType.BOOKING_REQUESTED]: CalendarCheck,
  [NotificationType.BOOKING_CONFIRMED]: CalendarCheck,
  [NotificationType.BOOKING_CANCELLED]: CalendarCheck,
  [NotificationType.BOOKING_UPDATED]: CalendarCheck,
  [NotificationType.BOOKING_REQUIRES_PAYMENT]: CalendarCheck,
  [NotificationType.FOLLOWER_NEW]: UserPlus,
  [NotificationType.FOLLOWER_ACTIVITY]: Users,
  [NotificationType.XP_GAINED]: Zap,
  [NotificationType.ACHIEVEMENT_UNLOCKED]: Trophy,
  [NotificationType.SYSTEM_ANNOUNCEMENT]: Bell,
  // System / superadmin
  [NotificationType.SYSTEM_NEW_USER]: UserPlus,
  [NotificationType.SYSTEM_BUG_REPORT]: Bug,
  [NotificationType.SYSTEM_SHARE_PURCHASE]: CreditCard,
  [NotificationType.SYSTEM_PAYMENT_FAILED]: AlertTriangle,
  [NotificationType.SYSTEM_NEW_PUBLIC_QUEST]: Megaphone,
  [NotificationType.SYSTEM_ABUSE_REPORT]: Flag,
  // Unit admin
  [NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST]: UserPlus,
  [NotificationType.UNIT_NEW_POD_JOIN_REQUEST]: UserPlus,
  [NotificationType.UNIT_PARTNERSHIP_REQUEST]: Handshake,
  [NotificationType.UNIT_PARTNERSHIP_ACCEPTED]: Handshake,
  [NotificationType.UNIT_NEW_QUEST_CREATED_UNDER_UNIT]: Megaphone,
  [NotificationType.UNIT_NEW_QUEST_UPDATE]: Megaphone,
  [NotificationType.UNIT_NEW_COMMENT_ON_QUEST]: MessageSquare,
  [NotificationType.UNIT_BOOKING_REQUEST]: CalendarCheck,
  [NotificationType.UNIT_BOOKING_CONFIRMED]: CalendarCheck,
  [NotificationType.UNIT_BOOKING_CANCELLED]: CalendarCheck,
  [NotificationType.UNIT_EVENT_CREATED]: Calendar,
  [NotificationType.UNIT_COURSE_CREATED]: GraduationCap,
  [NotificationType.UNIT_CO_HOST_CHANGED]: Users,
  [NotificationType.UNIT_AI_FLAGGED_CONTENT]: Brain,
  // User
  [NotificationType.USER_BOOKING_STATUS_CHANGED]: CalendarCheck,
  [NotificationType.USER_QUEST_UPDATE_FROM_FOLLOWED]: Megaphone,
  [NotificationType.USER_INVITED_TO_UNIT]: Users,
  [NotificationType.USER_SHARE_PURCHASE_CONFIRMED]: CreditCard,
};

const typeColors: Record<string, string> = {
  [NotificationType.COMMENT]: "text-primary",
  [NotificationType.QUEST_COMMENT]: "text-primary",
  [NotificationType.UPVOTE]: "text-accent",
  [NotificationType.QUEST_UPVOTE]: "text-accent",
  [NotificationType.INVITE]: "text-warning",
  [NotificationType.QUEST_UPDATE]: "text-success",
  [NotificationType.QUEST_CREATED]: "text-success",
  [NotificationType.GUILD_MEMBER_ADDED]: "text-primary",
  [NotificationType.GUILD_ROLE_CHANGED]: "text-warning",
  [NotificationType.GUILD_QUEST_CREATED]: "text-success",
  [NotificationType.POD_CREATED]: "text-primary",
  [NotificationType.POD_MESSAGE]: "text-primary",
  [NotificationType.BOOKING_REQUESTED]: "text-warning",
  [NotificationType.BOOKING_CONFIRMED]: "text-success",
  [NotificationType.BOOKING_CANCELLED]: "text-destructive",
  [NotificationType.FOLLOWER_NEW]: "text-primary",
  [NotificationType.XP_GAINED]: "text-accent",
  [NotificationType.ACHIEVEMENT_UNLOCKED]: "text-warning",
  [NotificationType.SYSTEM_ANNOUNCEMENT]: "text-muted-foreground",
  // System
  [NotificationType.SYSTEM_NEW_USER]: "text-primary",
  [NotificationType.SYSTEM_BUG_REPORT]: "text-warning",
  [NotificationType.SYSTEM_SHARE_PURCHASE]: "text-success",
  [NotificationType.SYSTEM_PAYMENT_FAILED]: "text-destructive",
  [NotificationType.SYSTEM_ABUSE_REPORT]: "text-destructive",
  // Unit admin
  [NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST]: "text-warning",
  [NotificationType.UNIT_NEW_POD_JOIN_REQUEST]: "text-warning",
  [NotificationType.UNIT_PARTNERSHIP_REQUEST]: "text-primary",
  [NotificationType.UNIT_PARTNERSHIP_ACCEPTED]: "text-success",
  [NotificationType.UNIT_BOOKING_REQUEST]: "text-warning",
  [NotificationType.UNIT_BOOKING_CONFIRMED]: "text-success",
  [NotificationType.UNIT_BOOKING_CANCELLED]: "text-destructive",
  [NotificationType.UNIT_EVENT_CREATED]: "text-primary",
  [NotificationType.UNIT_COURSE_CREATED]: "text-primary",
  [NotificationType.UNIT_AI_FLAGGED_CONTENT]: "text-destructive",
};

const SYSTEM_TYPES = [
  NotificationType.SYSTEM_NEW_USER, NotificationType.SYSTEM_BUG_REPORT,
  NotificationType.SYSTEM_SHARE_PURCHASE, NotificationType.SYSTEM_PAYMENT_FAILED,
  NotificationType.SYSTEM_NEW_PUBLIC_QUEST, NotificationType.SYSTEM_ABUSE_REPORT,
  NotificationType.SYSTEM_ANNOUNCEMENT,
];

const ADMIN_TYPES = [
  ...SYSTEM_TYPES,
  NotificationType.UNIT_NEW_GUILD_JOIN_REQUEST, NotificationType.UNIT_NEW_POD_JOIN_REQUEST,
  NotificationType.UNIT_PARTNERSHIP_REQUEST, NotificationType.UNIT_PARTNERSHIP_ACCEPTED,
  NotificationType.UNIT_NEW_QUEST_CREATED_UNDER_UNIT, NotificationType.UNIT_NEW_QUEST_UPDATE,
  NotificationType.UNIT_NEW_COMMENT_ON_QUEST, NotificationType.UNIT_BOOKING_REQUEST,
  NotificationType.UNIT_BOOKING_CONFIRMED, NotificationType.UNIT_BOOKING_CANCELLED,
  NotificationType.UNIT_EVENT_CREATED, NotificationType.UNIT_COURSE_CREATED,
  NotificationType.UNIT_CO_HOST_CHANGED, NotificationType.UNIT_AI_FLAGGED_CONTENT,
];

// Category grouping for type filter
const typeCategories: { label: string; types: NotificationType[] }[] = [
  { label: "Quests", types: [NotificationType.QUEST_CREATED, NotificationType.QUEST_UPDATED, NotificationType.QUEST_UPDATE, NotificationType.QUEST_COMPLETED, NotificationType.QUEST_COMMENT, NotificationType.QUEST_UPVOTE] },
  { label: "Comments", types: [NotificationType.COMMENT, NotificationType.UPVOTE] },
  { label: "Guilds", types: [NotificationType.GUILD_MEMBER_ADDED, NotificationType.GUILD_ROLE_CHANGED, NotificationType.GUILD_QUEST_CREATED, NotificationType.INVITE] },
  { label: "Pods", types: [NotificationType.POD_CREATED, NotificationType.POD_MESSAGE] },
  { label: "Bookings", types: [NotificationType.BOOKING, NotificationType.BOOKING_REQUESTED, NotificationType.BOOKING_CONFIRMED, NotificationType.BOOKING_CANCELLED, NotificationType.BOOKING_UPDATED, NotificationType.BOOKING_REQUIRES_PAYMENT] },
  { label: "Social", types: [NotificationType.FOLLOWER_NEW, NotificationType.FOLLOWER_ACTIVITY] },
  { label: "XP & Achievements", types: [NotificationType.XP_GAINED, NotificationType.ACHIEVEMENT_UNLOCKED] },
  { label: "System", types: SYSTEM_TYPES },
  { label: "Admin (Unit)", types: ADMIN_TYPES.filter(t => !SYSTEM_TYPES.includes(t)) },
];

const PAGE_SIZE = 20;

function dayLabel(dateStr: string, t: ReturnType<typeof useTranslation>["t"], lang: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return t("notifications.today");
    if (isYesterday(d)) return t("notifications.yesterday");
    return format(d, "EEEE, MMMM d", { locale: lang === "fr" ? fr : enUS });
  } catch {
    return "Earlier";
  }
}

export default function NotificationsCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { session } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { isAdmin: showAdminTabs } = useUserRoles(session?.user?.id);
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "admin" | "system">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filter
  const filtered = useMemo(() => {
    let list = notifications;
    if (readFilter === "unread") list = list.filter((n) => !n.isRead);
    else if (readFilter === "admin") list = list.filter((n) => ADMIN_TYPES.includes(n.type));
    else if (readFilter === "system") list = list.filter((n) => SYSTEM_TYPES.includes(n.type));
    if (typeFilter !== "all") {
      const category = typeCategories.find((c) => c.label === typeFilter);
      if (category) {
        list = list.filter((n) => category.types.includes(n.type));
      }
    }
    return list;
  }, [notifications, readFilter, typeFilter]);

  // Sort by createdAt desc
  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const aTime = a.createdAt || a.id;
      const bTime = b.createdAt || b.id;
      return bTime > aTime ? 1 : -1;
    }),
  [filtered]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: { label: string; items: typeof sorted }[] = [];
    const visible = sorted.slice(0, visibleCount);
    for (const n of visible) {
      const label = dayLabel(n.createdAt, t, lang);
      const existing = groups.find((g) => g.label === label);
      if (existing) existing.items.push(n);
      else groups.push({ label, items: [n] });
    }
    return groups;
  }, [sorted, visibleCount, t, lang]);

  const hasMore = visibleCount < sorted.length;

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto w-full px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold flex items-center gap-2 shrink-0">
          <Bell className="h-6 w-6 sm:h-7 sm:w-7 text-primary" /> {t("notifications.pageTitle")}
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground ml-2">{t("notifications.unread", { count: unreadCount })}</Badge>
          )}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Read/unread toggle */}
          <div className="flex rounded-lg border border-border overflow-x-auto">
            {(["all", "unread", ...(showAdminTabs ? ["admin", "system"] : [])] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReadFilter(f as any)}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors capitalize whitespace-nowrap",
                  readFilter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {f === "admin" ? t("notifications.admin") : f === "system" ? t("notifications.system") : f === "unread" ? t("notifications.unreadLabel") : t("notifications.all")}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] sm:w-[150px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t("notifications.filterType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("notifications.allTypes")}</SelectItem>
              {typeCategories.map((cat) => (
                <SelectItem key={cat.label} value={cat.label}>{t(`notifications.categories.${cat.label}`, cat.label)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="whitespace-nowrap">
              <CheckCheck className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{t("notifications.markAllRead")}</span><span className="sm:hidden">Read all</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0">
            <Link to="/me/settings?tab=notifications">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {readFilter === "unread" ? t("notifications.noUnread") : t("notifications.noNotifications")}
          </p>
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.label} className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{group.label}</h2>
          <div className="space-y-2">
            {group.items.map((notification, i) => {
              const Icon = typeIcons[notification.type] || Bell;
              const iconColor = typeColors[notification.type] || "text-muted-foreground";
              const translatedTitle = translateNotificationTitle(notification, t);
              const translatedBody = translateNotificationBody(notification, t);
              const link = notification.deepLinkUrl || linkForNotification(notification);

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Link
                    to={link}
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      "flex items-start gap-4 rounded-xl border p-4 transition-all hover:shadow-sm",
                      notification.isRead
                        ? "border-border bg-card"
                        : "border-primary/20 bg-primary/5"
                    )}
                  >
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", notification.isRead ? "bg-muted" : "bg-primary/10")}>
                      <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-xs font-semibold", notification.isRead ? "text-muted-foreground" : "text-foreground")}>
                          {translatedTitle}
                        </span>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      {translatedBody && translatedBody !== translatedTitle && (
                        <p className={cn("text-sm", notification.isRead ? "text-muted-foreground" : "text-foreground")}>
                          {translatedBody}
                        </p>
                      )}
                      {notification.createdAt && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {(() => {
                            try { return format(parseISO(notification.createdAt), "h:mm a"); } catch { return ""; }
                          })()}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "shrink-0 h-8 w-8 p-0",
                        notification.isRead
                          ? "text-primary/40 cursor-default"
                          : "text-muted-foreground hover:text-primary"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!notification.isRead) markAsRead(notification.id);
                      }}
                      title={notification.isRead ? "Read" : "Mark as read"}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            <ChevronDown className="h-4 w-4 mr-1" /> {t("notifications.loadMore")}
          </Button>
        </div>
      )}
      </div>
    </PageShell>
  );
}
