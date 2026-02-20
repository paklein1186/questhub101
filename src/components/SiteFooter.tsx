import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const FOOTER_LINKS = [
  { labelKey: "footer.vision", href: "/vision" },
  { labelKey: "footer.ecosystem", href: "/ecosystem" },
  { labelKey: "footer.legal", href: "/legal" },
  { labelKey: "footer.about", href: "/about" },
];

export function SiteFooter() {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

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
          changethegame — {t("footer.tagline")}
        </p>

        <nav className={`flex ${isMobile ? "flex-col items-center gap-3" : "flex-row items-center gap-8"}`}>
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-xs sm:text-sm font-semibold text-primary hover:text-secondary transition-colors duration-200"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
