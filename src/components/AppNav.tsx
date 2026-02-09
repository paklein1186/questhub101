import { Link, useLocation } from "react-router-dom";
import { Home, Shield, Compass, Zap, Bell, LayoutDashboard, CircleDot, Briefcase, CalendarClock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdmin } from "@/lib/admin";

const links = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/guilds", label: "Guilds", icon: Shield },
  { to: "/quests", label: "Quests", icon: Compass },
  { to: "/pods", label: "Pods", icon: CircleDot },
  { to: "/services", label: "Services", icon: Briefcase },
];

export function AppNav() {
  const { pathname } = useLocation();
  const { unreadCount } = useNotifications();
  const currentUser = useCurrentUser();
  const showAdmin = isAdmin(currentUser.email);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <Zap className="h-5 w-5 text-primary" />
          <span>QuestHub</span>
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.to || (link.to !== "/" && pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          <Link
            to="/notifications"
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ml-1",
              pathname === "/notifications"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          {showAdmin && (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
