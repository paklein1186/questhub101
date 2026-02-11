import { Link } from "react-router-dom";
import { Compass, Briefcase, Shield, Calendar, Handshake } from "lucide-react";
import { usePersona } from "@/hooks/usePersona";

export function QuickShortcuts() {
  const { label } = usePersona();

  const shortcuts = [
    { label: label("quest.label"), icon: Compass, route: "/work" },
    { label: label("service.my_label"), icon: Briefcase, route: "/me/services" },
    { label: label("guild.label"), icon: Shield, route: "/me/guilds" },
    { label: "My Bookings", icon: Calendar, route: "/me/bookings" },
    { label: "My Partners", icon: Handshake, route: "/work" },
  ];

  return (
    <section>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick access</h3>
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.route + s.label} to={s.route}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
