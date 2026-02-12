import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles } from "lucide-react";

const FOOTER_LINKS = [
  { label: "Manifesto", href: "/manifesto" },
  { label: "The Cooperative Venture", href: "/cooperative" },
  { label: "What Comes Next", href: "/what-comes-next" },
];

export function SiteFooter() {
  const isMobile = useIsMobile();

  return (
    <footer className="mt-auto pt-12 pb-8 sm:pt-16 sm:pb-10">
      <div className="container flex flex-col items-center gap-6">
        {/* Decorative divider */}
        <div className="flex items-center gap-3 text-muted-foreground/40">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/30" />
          <Sparkles className="h-4 w-4 text-primary/40" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/30" />
        </div>

        <p className="text-xs tracking-widest uppercase text-muted-foreground/60 font-medium">
          changethegame — Human-powered. AI-augmented. Community-owned.
        </p>

        <nav
          className={`flex ${isMobile ? "flex-col items-center gap-3" : "flex-row items-center gap-6"}`}
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-xs sm:text-sm font-semibold text-primary hover:text-secondary transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}