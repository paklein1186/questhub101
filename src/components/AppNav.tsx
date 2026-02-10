import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Briefcase, Users, Bell, LayoutDashboard, Zap, LogIn, LogOut, User, Palette } from "lucide-react";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { useUserRoles } from "@/lib/admin";
import { useFeatureFlags, isFeatureEnabled } from "@/hooks/useFeatureFlags";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { user, signOut, session } = useAuth();
  const currentUser = useCurrentUser();
  const { label } = usePersona();
  const isLoggedIn = !!session;
  const { isAdmin: showAdmin } = useUserRoles(session?.user?.id);
  const { data: flags = [] } = useFeatureFlags();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const authedLinks = [
    { to: "/", label: "Home", icon: Home },
    { to: "/explore", label: "Explore", icon: Search },
    { to: "/work", label: label("nav.work"), icon: Briefcase },
    ...(isFeatureEnabled(flags, "feature_network_section")
      ? [{ to: "/network", label: "Network", icon: Users }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <Zap className="h-5 w-5 text-primary" />
          <span>ChangeTheGame</span>
        </Link>

        <nav className="flex items-center gap-1">
          {isLoggedIn ? (
            <>
              <GlobalSearchDialog />
              {authedLinks.map((link) => {
                const active = link.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.to);
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
                    <span className="hidden sm:inline">{link.label}</span>
                  </Link>
                );
              })}

              {/* Bell */}
              <Link
                to="/notifications"
                className={cn(
                  "relative flex items-center px-2.5 py-1.5 rounded-md text-sm transition-colors ml-1",
                  pathname === "/notifications"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                title="Notifications"
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
                    "flex items-center px-2.5 py-1.5 rounded-md text-sm transition-colors",
                    pathname === "/admin"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Admin Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </Link>
              )}

              {/* Unified user menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "ml-2 flex items-center gap-1.5 rounded-full px-1.5 py-1 transition-all",
                    pathname.startsWith("/me")
                      ? "ring-2 ring-primary"
                      : "hover:ring-2 hover:ring-primary/20"
                  )}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatarUrl} />
                      <AvatarFallback className="text-xs">{user?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium text-foreground">Me</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/me" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" /> My Hub
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/users/${currentUser.id}`} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" /> My public profile
                    </Link>
                  </DropdownMenuItem>
                  {showAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="cursor-pointer">
                          <LayoutDashboard className="h-4 w-4 mr-2" /> Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to="/explore"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  pathname.startsWith("/explore")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Explore</span>
              </Link>
              <Button size="sm" variant="ghost" asChild className="ml-2">
                <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
