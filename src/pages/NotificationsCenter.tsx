import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Filter, MessageSquare, ThumbsUp, Users, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useNotifications, linkForNotification } from "@/hooks/useNotifications";
import { NotificationType } from "@/types/enums";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof MessageSquare> = {
  [NotificationType.COMMENT]: MessageSquare,
  [NotificationType.UPVOTE]: ThumbsUp,
  [NotificationType.INVITE]: Users,
  [NotificationType.QUEST_UPDATE]: Megaphone,
};

const typeColors: Record<string, string> = {
  [NotificationType.COMMENT]: "text-primary",
  [NotificationType.UPVOTE]: "text-accent",
  [NotificationType.INVITE]: "text-warning",
  [NotificationType.QUEST_UPDATE]: "text-success",
};

export default function NotificationsCenter() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;
  const sorted = [...filtered].sort((a, b) => {
    const aTime = (a as any).data?.createdAt || a.id;
    const bTime = (b as any).data?.createdAt || b.id;
    return bTime > aTime ? 1 : -1;
  });

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" /> Notifications
          {unreadCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground ml-2">{unreadCount} unread</Badge>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                filter === "unread" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.length === 0 && (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {filter === "unread" ? "No unread notifications." : "No notifications yet."}
            </p>
          </div>
        )}
        {sorted.map((notification, i) => {
          const Icon = typeIcons[notification.type] || Bell;
          const iconColor = typeColors[notification.type] || "text-muted-foreground";
          const data = notification.data as Record<string, unknown>;
          const message = (data.message as string) || "You have a notification.";
          const link = linkForNotification(notification);

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
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
                  <Icon className={cn("h-4.5 w-4.5", iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {notification.type.toLowerCase().replace("_", " ")}
                    </Badge>
                    {!notification.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className={cn("text-sm", notification.isRead ? "text-muted-foreground" : "text-foreground font-medium")}>
                    {message}
                  </p>
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
    </PageShell>
  );
}
