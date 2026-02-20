import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const VISION_LINKS = [
  { labelKey: "footer.manifesto", href: "/manifesto" },
  { labelKey: "footer.cooperative", href: "/cooperative" },
  { labelKey: "footer.whatComesNext", href: "/what-comes-next" },
  { labelKey: "footer.useCases", href: "/use-cases" },
];

const ECOSYSTEM_LINKS = [
  { labelKey: "footer.revenueModels", href: "/revenue-models" },
  { labelKey: "footer.creditEconomy", href: "/credit-economy" },
  { labelKey: "footer.governance", href: "/governance" },
];

const LEGAL_LINKS = [
  { labelKey: "footer.privacy", href: "/privacy" },
  { labelKey: "footer.terms", href: "/terms" },
  { labelKey: "footer.contact", href: "/contact" },
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

        <div className={`flex ${isMobile ? "flex-col items-center gap-6" : "flex-row items-start gap-12"}`}>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">{t("footer.vision")}</span>
            <nav className={`flex ${isMobile ? "flex-col items-center gap-2" : "flex-row items-center gap-5"}`}>
              {VISION_LINKS.map((link) => (
                <Link key={link.href} to={link.href} className="text-xs sm:text-sm font-semibold text-primary hover:text-secondary transition-colors duration-200">
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">{t("footer.ecosystem")}</span>
            <nav className={`flex ${isMobile ? "flex-col items-center gap-2" : "flex-row items-center gap-5"}`}>
              {ECOSYSTEM_LINKS.map((link) => (
                <Link key={link.href} to={link.href} className="text-xs sm:text-sm font-semibold text-primary hover:text-secondary transition-colors duration-200">
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground/50 font-semibold">{t("footer.legal")}</span>
            <nav className={`flex ${isMobile ? "flex-col items-center gap-2" : "flex-row items-center gap-5"}`}>
              {LEGAL_LINKS.map((link) => (
                <Link key={link.href} to={link.href} className="text-xs sm:text-sm font-semibold text-primary hover:text-secondary transition-colors duration-200">
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
