import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const FOOTER_LINKS = [
  { label: "Manifesto", href: "/manifesto" },
  { label: "The Cooperative Venture", href: "/cooperative" },
  { label: "What Comes Next", href: "/what-comes-next" },
];

export function SiteFooter() {
  const isMobile = useIsMobile();

  return (
    <footer className="mt-auto py-10 sm:py-16">
      <div className="container flex flex-col items-center gap-6">
        <p className="text-xs tracking-wide" style={{ color: "#6B6B6B" }}>
          changethegame — Human-powered. AI-augmented. Community-owned.
        </p>
        <nav
          className={`flex ${isMobile ? "flex-col items-center gap-3" : "flex-row items-center gap-6"}`}
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-xs sm:text-sm hover:underline transition-colors"
              style={{ color: "#6B6B6B" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
