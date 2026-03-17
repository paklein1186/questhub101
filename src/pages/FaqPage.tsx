import { useState, useMemo, useRef } from "react";
import { Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─── Section definitions (keys only, content from i18n) ─── */
const SECTION_DEFS = [
  { id: "core", emoji: "🧭", questionCount: 3 },
  { id: "commons-ai-tech", emoji: "🌍", questionCount: 5 },
  { id: "value-ownership", emoji: "🏦", questionCount: 9 },
  { id: "platform-usage", emoji: "🧪", questionCount: 5 },
  { id: "data-infra", emoji: "🔐", questionCount: 3 },
  { id: "ecosystem-vision", emoji: "🌍", questionCount: 2 },
  { id: "alpha-disclaimer", emoji: "🧪", questionCount: 1 },
];

interface FaqItem { q: string; a: string[] }
interface FaqSection { id: string; emoji: string; title: string; items: FaqItem[] }

export default function FaqPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Build sections from translation keys
  const sections: FaqSection[] = useMemo(() =>
    SECTION_DEFS.map((def) => ({
      id: def.id,
      emoji: def.emoji,
      title: t(`faqPage.sections.${def.id}.title`),
      items: Array.from({ length: def.questionCount }, (_, i) => ({
        q: t(`faqPage.sections.${def.id}.q${i + 1}`),
        a: t(`faqPage.sections.${def.id}.a${i + 1}`, { returnObjects: true }) as string[],
      })),
    })),
    [t]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.some((line) => line.toLowerCase().includes(q))
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [search, sections]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            {t("faqPage.headerTitle")} <span className="text-primary">{t("faqPage.headerAlpha")}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t("faqPage.headerSubtitle")}
          </p>
        </div>

        {/* ── Intro banner ── */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-8 text-sm text-foreground/80 space-y-1">
          <p className="font-semibold text-foreground">{t("faqPage.introBannerTitle")}</p>
          <p>{t("faqPage.introBannerText")}</p>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("faqPage.searchPlaceholder")}
            className="pl-10"
          />
        </div>

        {/* ── Section pills ── */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors font-medium ${
                activeSection === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {s.emoji} {s.title}
            </button>
          ))}
        </div>

        {/* ── Accordion sections ── */}
        <div className="space-y-10">
          {filtered.map((section) => (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="scroll-mt-24"
            >
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">{section.emoji}</span> {section.title}
              </h2>
              <Accordion type="multiple" className="space-y-2">
                {section.items.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${section.id}-${idx}`}
                    className="border border-border rounded-lg px-4 bg-card data-[state=open]:bg-accent/30"
                  >
                    <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-2">
                      {item.a.map((line, li) => (
                        <p
                          key={li}
                          className={`text-sm leading-relaxed ${
                            line.startsWith("👉") || line.startsWith("⚠️")
                              ? "text-primary font-medium mt-2"
                              : "text-muted-foreground"
                          }`}
                        >
                          {line}
                        </p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("faqPage.noResults")}
            </p>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="mt-16 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-8 text-center space-y-4">
          <h3 className="font-display text-xl font-bold">{t("faqPage.ctaTitle")}</h3>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {t("faqPage.ctaText")}
          </p>
          <Button asChild>
            <Link to="/contact">
              <MessageSquare className="h-4 w-4 mr-2" /> {t("faqPage.ctaButton")}
            </Link>
          </Button>
        </div>

        {/* ── Final note ── */}
        <p className="text-center text-muted-foreground/60 text-xs mt-10 italic">
          {t("faqPage.finalNote")}
        </p>
      </div>
    </PageShell>
  );
}
