import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell, Check, CheckCheck, MessageSquare, ThumbsUp, Users, Megaphone,
  CalendarCheck, UserPlus, Zap, Trophy, Shield, Radio, ChevronDown,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useNotifications, linkForNotification } from "@/hooks/useNotifications";
import { NotificationType } from "@/types/enums";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

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
};

// Category grouping for type filter
const typeCategories: { label: string; types: NotificationType[] }[] = [
  { label: "Quests", types: [NotificationType.QUEST_CREATED, NotificationType.QUEST_UPDATED, NotificationType.QUEST_UPDATE, NotificationType.QUEST_COMPLETED, NotificationType.QUEST_COMMENT, NotificationType.QUEST_UPVOTE] },
  { label: "Comments", types: [NotificationType.COMMENT, NotificationType.UPVOTE] },
  { label: "Guilds", types: [NotificationType.GUILD_MEMBER_ADDED, NotificationType.GUILD_ROLE_CHANGED, NotificationType.GUILD_QUEST_CREATED, NotificationType.INVITE] },
  { label: "Pods", types: [NotificationType.POD_CREATED, NotificationType.POD_MESSAGE] },
  { label: "Bookings", types: [NotificationType.BOOKING, NotificationType.BOOKING_REQUESTED, NotificationType.BOOKING_CONFIRMED, NotificationType.BOOKING_CANCELLED, NotificationType.BOOKING_UPDATED, NotificationType.BOOKING_REQUIRES_PAYMENT] },
  { label: "Social", types: [NotificationType.FOLLOWER_NEW, NotificationType.FOLLOWER_ACTIVITY] },
  { label: "XP & Achievements", types: [NotificationType.XP_GAINED, NotificationType.ACHIEVEMENT_UNLOCKED] },
  { label: "System", types: [NotificationType.SYSTEM_ANNOUNCEMENT] },
];

const PAGE_SIZE = 20;

function dayLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEEE, MMMM d");
  } catch {
    return "Earlier";
  }
}

export default function NotificationsCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filter
  const filtered = useMemo(() => {
    let list = notifications;
    if (readFilter === "unread") list = list.filter((n) => !n.isRead);
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
      const label = dayLabel(n.createdAt);
      const existing = groups.find((g) => g.label === label);
      if (existing) existing.items.push(n);
      else groups.push({ label, items: [n] });
    }
    return groups;
  }, [sorted, visibleCount]);

  const hasMore = visibleCount < sorted.length;

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" /> Notifications
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground ml-2">{unreadCount} unread</Badge>
          )}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Read/unread toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setReadFilter("all")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                readFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            <button
              onClick={() => setReadFilter("unread")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                readFilter === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              Unread
            </button>
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {typeCategories.map((cat) => (
                <SelectItem key={cat.label} value={cat.label}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-16">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {readFilter === "unread" ? "No unread notifications." : "No notifications yet."}
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
              const message = notification.body || notification.title || (notification.data as any)?.message || "You have a notification.";
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
                          {notification.title}
                        </span>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      {notification.body && notification.body !== notification.title && (
                        <p className={cn("text-sm", notification.isRead ? "text-muted-foreground" : "text-foreground")}>
                          {notification.body}
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
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
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
            <ChevronDown className="h-4 w-4 mr-1" /> Load more
          </Button>
        </div>
      )}
    </PageShell>
  );
}
