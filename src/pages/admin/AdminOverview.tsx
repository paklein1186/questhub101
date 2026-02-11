import { Link } from "react-router-dom";
import { Bell, AlertTriangle, UserPlus, CreditCard, Flag, Bug, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { AnalyticsTab } from "./tabs/AnalyticsTab";

const SYSTEM_TYPES = [
  "SYSTEM_NEW_USER", "SYSTEM_BUG_REPORT", "SYSTEM_SHARE_PURCHASE",
  "SYSTEM_PAYMENT_FAILED", "SYSTEM_NEW_PUBLIC_QUEST", "SYSTEM_ABUSE_REPORT",
  "SYSTEM_ANNOUNCEMENT",
];

const typeIcons: Record<string, typeof Bell> = {
  SYSTEM_NEW_USER: UserPlus,
  SYSTEM_BUG_REPORT: Bug,
  SYSTEM_SHARE_PURCHASE: CreditCard,
  SYSTEM_PAYMENT_FAILED: AlertTriangle,
  SYSTEM_NEW_PUBLIC_QUEST: Megaphone,
  SYSTEM_ABUSE_REPORT: Flag,
  SYSTEM_ANNOUNCEMENT: Bell,
};

const typeColors: Record<string, string> = {
  SYSTEM_NEW_USER: "text-primary",
  SYSTEM_BUG_REPORT: "text-warning",
  SYSTEM_SHARE_PURCHASE: "text-success",
  SYSTEM_PAYMENT_FAILED: "text-destructive",
  SYSTEM_ABUSE_REPORT: "text-destructive",
};

export default function AdminOverview() {
  const { data: systemNotifications = [] } = useQuery({
    queryKey: ["admin-system-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, created_at, is_read, deep_link_url")
        .in("type", SYSTEM_TYPES)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-8">
      {/* Recent critical notifications */}
      {systemNotifications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Recent Critical Notifications
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/notifications">View all</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {systemNotifications.slice(0, 5).map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              const color = typeColors[n.type] || "text-muted-foreground";
              return (
                <Link
                  key={n.id}
                  to={n.deep_link_url || "/notifications"}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
                    n.is_read ? "border-border bg-card" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${n.is_read ? "bg-muted" : "bg-primary/10"}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{n.title}</span>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                    {(() => { try { return format(parseISO(n.created_at), "MMM d, h:mm a"); } catch { return ""; } })()}
                  </span>
                  <Badge variant="outline" className="text-[9px] shrink-0">{n.type.replace("SYSTEM_", "").replace(/_/g, " ")}</Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing analytics */}
      <AnalyticsTab />
    </div>
  );
}
