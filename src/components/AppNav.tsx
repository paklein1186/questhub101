import { Link, useLocation } from "react-router-dom";
import { Home, Shield, Compass, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/guilds", label: "Guilds", icon: Shield },
  { to: "/quests", label: "Quests", icon: Compass },
];

export function AppNav() {
  const { pathname } = useLocation();

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
        </nav>
      </div>
    </header>
  );
}
