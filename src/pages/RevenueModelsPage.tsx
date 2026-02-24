import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Landmark,
  Banknote,
  Coins,
  Star,
  TrendingUp,
  ShieldCheck,
  LayoutGrid,
} from "lucide-react";

const SECTION_ICONS = [LayoutGrid, Landmark, Banknote, Coins, Star, TrendingUp, ShieldCheck] as const;
const SECTION_IDS = ["overview", "shareholding", "monetary", "credits", "xp", "sustainability", "governance"] as const;

function CalloutBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-semibold text-foreground leading-relaxed">
      {children}
    </div>
  );
}

function SectionHeader({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) {
  return (
    <div id={id} className="scroll-mt-28 flex items-center gap-3 mb-4 pt-8 first:pt-0">
      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground leading-relaxed space-y-3 text-sm sm:text-base">{children}</div>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm sm:text-base">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function RevenueModelsPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");

  const sectionLabels = [
    t("revenuePage.overview"),
    t("revenuePage.shareholding"),
    t("revenuePage.monetary"),
    t("revenuePage.credits"),
    t("revenuePage.xpReputation"),
    t("revenuePage.sustainability"),
    t("revenuePage.governanceSafeguards"),
  ];

  const scrollTo = useCallback((id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );
    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const shareholdingItems = t("revenuePage.shareholdingItems", { returnObjects: true }) as string[];
  const monetaryItems = t("revenuePage.monetaryItems", { returnObjects: true }) as string[];
  const monetaryPrincipleItems = t("revenuePage.monetaryPrincipleItems", { returnObjects: true }) as string[];
  const creditsCoreItems = t("revenuePage.creditsCoreItems", { returnObjects: true }) as string[];
  const creditsObtainedItems = t("revenuePage.creditsObtainedItems", { returnObjects: true }) as string[];
  const creditsUsedItems = t("revenuePage.creditsUsedItems", { returnObjects: true }) as string[];
  const xpPropItems = t("revenuePage.xpPropItems", { returnObjects: true }) as string[];
  const xpEarnedItems = t("revenuePage.xpEarnedItems", { returnObjects: true }) as string[];
  const xpPurposeItems = t("revenuePage.xpPurposeItems", { returnObjects: true }) as string[];
  const sustainabilityItems = t("revenuePage.sustainabilityItems", { returnObjects: true }) as string[];
  const sustainabilityNotItems = t("revenuePage.sustainabilityNotItems", { returnObjects: true }) as string[];
  const governanceItems = t("revenuePage.governanceItems", { returnObjects: true }) as string[];
  const governancePrincipleItems = t("revenuePage.governancePrincipleItems", { returnObjects: true }) as string[];

  const overviewBoxes = [
    { icon: Landmark, title: t("revenuePage.ownership"), desc: t("revenuePage.ownershipDesc") },
    { icon: Banknote, title: t("revenuePage.money"), desc: t("revenuePage.moneyDesc") },
    { icon: Coins, title: t("revenuePage.creditsLabel"), desc: t("revenuePage.creditsDesc") },
    { icon: Star, title: t("revenuePage.xpLabel"), desc: t("revenuePage.xpDesc") },
  ];

  const content = (
    <>
      <title>Revenue Models &amp; Economic Framework — changethegame</title>
      <meta name="description" content="Explanation of ownership, monetary flows, credits, and reputation systems within the platform." />

      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1">{t("pages.revenue.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("pages.revenue.subtitle")}</p>
        </header>

        <nav className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 -mx-4 px-4 py-2 mb-6" aria-label="Page sections">
          {isMobile ? (
            <Select value={activeTab} onValueChange={scrollTo}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SECTION_IDS.map((id, i) => (
                  <SelectItem key={id} value={id}>{sectionLabels[i]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none" role="tablist">
              {SECTION_IDS.map((id, i) => {
                const Icon = SECTION_ICONS[i];
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => scrollTo(id)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {sectionLabels[i]}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* OVERVIEW */}
        <section>
          <SectionHeader id="overview" title={t("revenuePage.overview")} icon={LayoutGrid} />
          <Prose><p>{t("revenuePage.overviewP")}</p></Prose>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {overviewBoxes.map((box) => (
              <Card key={box.title} className="border-border/50 bg-muted/30">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <box.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{box.title}</p>
                    <p className="text-xs text-muted-foreground">{box.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* SHAREHOLDING */}
        <section>
          <SectionHeader id="shareholding" title={t("revenuePage.shareholding")} icon={Landmark} />
          <Prose>
            <p>{t("revenuePage.shareholdingP")}</p>
            <BulletList items={Array.isArray(shareholdingItems) ? shareholdingItems : []} />
          </Prose>
          <div className="mt-4">
            <CalloutBox>{t("revenuePage.shareholdingCallout").split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</CalloutBox>
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* MONETARY */}
        <section>
          <SectionHeader id="monetary" title={t("revenuePage.monetary")} icon={Banknote} />
          <Prose>
            <p>{t("revenuePage.monetaryP")}</p>
            <BulletList items={Array.isArray(monetaryItems) ? monetaryItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.monetaryPrinciples")}</p>
            <BulletList items={Array.isArray(monetaryPrincipleItems) ? monetaryPrincipleItems : []} />
            <p>{t("revenuePage.monetaryNote")}</p>
          </Prose>
        </section>

        <hr className="my-8 border-border/40" />

        {/* CREDITS */}
        <section>
          <SectionHeader id="credits" title={t("revenuePage.credits")} icon={Coins} />
          <Prose>
            <p>{t("revenuePage.creditsP")}</p>
            <p className="font-semibold text-foreground">{t("revenuePage.creditsCoreProps")}</p>
            <BulletList items={Array.isArray(creditsCoreItems) ? creditsCoreItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.creditsObtained")}</p>
            <BulletList items={Array.isArray(creditsObtainedItems) ? creditsObtainedItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.creditsUsedFor")}</p>
            <BulletList items={Array.isArray(creditsUsedItems) ? creditsUsedItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.demurrageTitle")}</p>
            <p>{t("revenuePage.demurrageP")}</p>
          </Prose>
          <div className="mt-4 space-y-3">
            <CalloutBox>
              {t("revenuePage.creditsCallout")}
              <br />
              <span className="text-xs font-normal text-muted-foreground">{t("revenuePage.creditsCalloutSub")}</span>
            </CalloutBox>
            <a href="/credit-economy" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
              {t("revenuePage.learnMoreCredits")}
            </a>
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* XP */}
        <section>
          <SectionHeader id="xp" title={t("revenuePage.xpReputation")} icon={Star} />
          <Prose>
            <p>{t("revenuePage.xpP")}</p>
            <p className="font-semibold text-foreground">{t("revenuePage.xpProps")}</p>
            <BulletList items={Array.isArray(xpPropItems) ? xpPropItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.xpEarned")}</p>
            <BulletList items={Array.isArray(xpEarnedItems) ? xpEarnedItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.xpPurpose")}</p>
            <BulletList items={Array.isArray(xpPurposeItems) ? xpPurposeItems : []} />
          </Prose>
          <div className="mt-4">
            <CalloutBox>{t("revenuePage.xpCallout")}</CalloutBox>
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* SUSTAINABILITY */}
        <section>
          <SectionHeader id="sustainability" title={t("revenuePage.sustainability")} icon={TrendingUp} />
          <Prose>
            <p>{t("revenuePage.sustainabilityP")}</p>
            <BulletList items={Array.isArray(sustainabilityItems) ? sustainabilityItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.sustainabilityNot")}</p>
            <BulletList items={Array.isArray(sustainabilityNotItems) ? sustainabilityNotItems : []} />
          </Prose>
        </section>

        <hr className="my-8 border-border/40" />

        {/* GOVERNANCE */}
        <section>
          <SectionHeader id="governance" title={t("revenuePage.governanceSafeguards")} icon={ShieldCheck} />
          <Prose>
            <p>{t("revenuePage.governanceP")}</p>
            <BulletList items={Array.isArray(governanceItems) ? governanceItems : []} />
            <p className="font-semibold text-foreground pt-2">{t("revenuePage.governancePrinciples")}</p>
            <BulletList items={Array.isArray(governancePrincipleItems) ? governancePrincipleItems : []} />
          </Prose>
        </section>

        <div className="h-16" />
      </div>
    </>
  );
  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}
