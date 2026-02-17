import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Briefcase, Users, Bell, LayoutDashboard, LogIn, LogOut, User, Menu, X, Rss, Mail, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo.png";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadMessageCount } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { useUserRoles } from "@/lib/admin";
import { useFeatureFlags, isFeatureEnabled } from "@/hooks/useFeatureFlags";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

function LanguageSwitcherInline() {
  const { i18n, t } = useTranslation();
  const { session } = useAuth();
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const switchLang = async (code: string) => {
    i18n.changeLanguage(code);
    if (session?.user?.id) {
      await supabase.from("profiles").update({ preferred_language: code } as any).eq("user_id", session.user.id);
    }
  };

  return (
    <div className="px-1 py-1">
      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{t("language.switcher")}</p>
      <div className="flex gap-1 px-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => switchLang(lang.code)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              lang.code === current.code
                ? "bg-primary/10 font-medium text-foreground ring-1 ring-primary/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AppNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const unreadMessages = useUnreadMessageCount();
  const { user, signOut, session } = useAuth();
  const currentUser = useCurrentUser();
  const { label } = usePersona();
  const isLoggedIn = !!session;
  const { isAdmin: showAdmin } = useUserRoles(session?.user?.id);
  const { data: flags = [] } = useFeatureFlags();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const authedLinks = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/explore", label: label("nav.explore"), icon: Search },
    { to: "/feed", label: t("nav.feed"), icon: Rss },
    { to: "/work", label: t("nav.work"), icon: Briefcase },
    ...(isFeatureEnabled(flags, "feature_network_section")
      ? [{ to: "/network", label: t("nav.network"), icon: Users }]
      : []),
  ];

  const navLink = (link: { to: string; label: string; icon: any }, onClick?: () => void) => {
    const active = link.to === "/"
      ? pathname === "/"
      : pathname.startsWith(link.to);
    return (
      <Link
        key={link.to}
        to={link.to}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <link.icon className="h-4 w-4" />
        <span>{link.label}</span>
      </Link>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-14 md:h-16 items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight shrink-0 group">
            <img src={logoImg} alt="changethegame" className="h-6 w-6 md:h-7 md:w-7 transition-transform group-hover:scale-110 group-hover:rotate-6" />
            <span className="hidden xs:inline bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary text-base md:text-lg">changethegame</span>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
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
                          "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                          active
                            ? "gradient-primary text-primary-foreground shadow-playful"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                        )}
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}

                  {/* Unified profile menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="relative ml-2 flex items-center rounded-full transition-all hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user?.avatarUrl} />
                          <AvatarFallback className="text-xs">{user?.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        {(unreadCount + unreadMessages) > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm">
                            {(unreadCount + unreadMessages) > 9 ? "9+" : unreadCount + unreadMessages}
                          </span>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/inbox" className="cursor-pointer justify-between">
                          <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> {t("nav.messages")}</span>
                          {unreadMessages > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                              {unreadMessages > 9 ? "9+" : unreadMessages}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/notifications" className="cursor-pointer justify-between">
                          <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> {t("nav.notifications")}</span>
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                              {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                          )}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/me" className="cursor-pointer">
                          <User className="h-4 w-4 mr-2" /> {t("nav.myHub")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/users/${currentUser.id}`} className="cursor-pointer">
                          <User className="h-4 w-4 mr-2" /> {t("nav.myPublicProfile")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <LanguageSwitcherInline />
                      {showAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer">
                              <LayoutDashboard className="h-4 w-4 mr-2" /> {t("nav.admin")}
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                        <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <LanguageSwitcher />
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
                    <span>{t("nav.explore")}</span>
                  </Link>
                  <Button size="sm" variant="ghost" asChild className="ml-2">
                    <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> {t("nav.login")}</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/welcome">{t("nav.signup")}</Link>
                  </Button>
                </>
              )}
            </nav>
          )}

          {/* Mobile top bar — compact: logo + key actions + hamburger */}
          {isMobile && (
            <div className="flex items-center gap-0.5">
              {isLoggedIn && (
                <>
                  <GlobalSearchDialog />
                </>
              )}

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  {isLoggedIn ? (
                    <button className="relative flex items-center justify-center h-9 w-9 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatarUrl} />
                        <AvatarFallback className="text-[10px]">{user?.name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      {(unreadCount + unreadMessages) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                          {(unreadCount + unreadMessages) > 9 ? "9+" : unreadCount + unreadMessages}
                        </span>
                      )}
                    </button>
                  ) : (
                    <button className="flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:bg-muted">
                      <Menu className="h-5 w-5" />
                    </button>
                  )}
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <Link to="/" onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 font-display text-lg font-bold">
                        <img src={logoImg} alt="changethegame" className="h-5 w-5" /> changethegame
                      </Link>
                    </div>

                    {/* Links */}
                    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                      {isLoggedIn ? (
                        <>
                          {/* User info */}
                          <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-muted/50">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user?.avatarUrl} />
                              <AvatarFallback className="text-xs">{user?.name?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{user?.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                            </div>
                          </div>

                          <div className="py-2">
                            <div className="h-px bg-border" />
                          </div>

                          <Link to="/me" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                            <User className="h-4 w-4" /> {t("nav.myHub")}
                          </Link>
                          <Link to={`/users/${currentUser.id}`} onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                            <User className="h-4 w-4" /> {t("nav.myPublicProfile")}
                          </Link>
                          <Link to="/inbox" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Mail className="h-4 w-4" /> {t("nav.messages")}
                            {unreadMessages > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                {unreadMessages > 9 ? "9+" : unreadMessages}
                              </span>
                            )}
                          </Link>
                          <Link to="/notifications" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Bell className="h-4 w-4" /> {t("nav.notifications")}
                            {unreadCount > 0 && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </span>
                            )}
                          </Link>

                          <div className="py-2">
                            <div className="h-px bg-border" />
                          </div>
                          <LanguageSwitcher variant="full" />

                          {showAdmin && (
                            <>
                              <div className="py-2">
                                <div className="h-px bg-border" />
                              </div>
                              <Link to="/admin" onClick={() => setMobileOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                                <LayoutDashboard className="h-4 w-4" /> {t("nav.admin")}
                              </Link>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <Link to="/explore" onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Search className="h-4 w-4" /> {t("nav.explore")}
                          </Link>
                        </>
                      )}
                    </nav>

                    {/* Bottom actions */}
                    <div className="border-t border-border px-3 py-4 space-y-2">
                      {isLoggedIn ? (
                        <Button variant="destructive" size="sm" className="w-full" onClick={() => { handleLogout(); setMobileOpen(false); }}>
                          <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
                        </Button>
                      ) : (
                        <>
                          <Button size="sm" className="w-full" asChild>
                            <Link to="/welcome" onClick={() => setMobileOpen(false)}>{t("nav.signup")}</Link>
                          </Button>
                          <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link to="/login" onClick={() => setMobileOpen(false)}>
                              <LogIn className="h-4 w-4 mr-1" /> {t("nav.login")}
                            </Link>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar — only for logged-in users */}
      {isMobile && isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-xl safe-bottom">
          <div className="flex items-stretch justify-around h-14">
            {authedLinks.map((link) => {
              const active = link.to === "/"
                ? pathname === "/"
                : pathname.startsWith(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <link.icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
                  <span className="leading-none">{link.label}</span>
                </Link>
              );
            })}
            {/* Me tab */}
            <Link
              to="/me"
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors",
                pathname.startsWith("/me")
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Avatar className={cn("h-5 w-5", pathname.startsWith("/me") && "ring-1.5 ring-primary")}>
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="text-[8px]">{user?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="leading-none">{t("nav.me")}</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
