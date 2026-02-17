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

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "shareholding", label: "Shareholding", icon: Landmark },
  { id: "monetary", label: "Monetary Transactions", icon: Banknote },
  { id: "credits", label: "Credits", icon: Coins },
  { id: "xp", label: "XP (Reputation)", icon: Star },
  { id: "sustainability", label: "Platform Sustainability", icon: TrendingUp },
  { id: "governance", label: "Governance & Safeguards", icon: ShieldCheck },
] as const;

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

export default function RevenueModelsPage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = useCallback((id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Observe which section is in view
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
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <PageShell>
      {/* SEO */}
      <title>Revenue Models &amp; Economic Framework — changethegame</title>
      <meta name="description" content="Explanation of ownership, monetary flows, credits, and reputation systems within the platform." />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-1">{t("pages.revenue.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t("pages.revenue.subtitle")}
          </p>
        </header>

        {/* Tab navigation */}
        <nav
          className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/40 -mx-4 px-4 py-2 mb-6"
          aria-label="Page sections"
        >
          {isMobile ? (
            <Select value={activeTab} onValueChange={scrollTo}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none" role="tablist">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={activeTab === s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* ───── OVERVIEW ───── */}
        <section>
          <SectionHeader id="overview" title="Overview" icon={LayoutGrid} />
          <Prose>
            <p>
              The platform operates on four distinct economic layers, each serving a specific purpose.
              These layers are intentionally separated to avoid confusion and ensure alignment between
              ownership, value exchange, utility, and recognition.
            </p>
          </Prose>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {[
              { icon: Landmark, title: "Ownership", desc: "Governance rights through formal shareholding." },
              { icon: Banknote, title: "Money", desc: "External value exchange between parties." },
              { icon: Coins, title: "Credits", desc: "Internal utility units for platform features." },
              { icon: Star, title: "XP", desc: "Contribution-based reputation recognition." },
            ].map((box) => (
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

        {/* ───── SHAREHOLDING ───── */}
        <section>
          <SectionHeader id="shareholding" title="Shareholding" icon={Landmark} />
          <Prose>
            <p>
              Shareholding refers to legal participation in ownership or governance, governed by formal
              legal statutes. It may grant governance rights depending on the legal structure.
            </p>
            <BulletList
              items={[
                "Is not automatically linked to XP, credits, or usage.",
                "Does not guarantee financial returns unless legally defined.",
                "Is separate from platform participation.",
              ]}
            />
          </Prose>
          <div className="mt-4">
            <CalloutBox>
              Shareholding ≠ XP<br />
              Shareholding ≠ Credits<br />
              Shareholding ≠ Guaranteed Income
            </CalloutBox>
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* ───── MONETARY TRANSACTIONS ───── */}
        <section>
          <SectionHeader id="monetary" title="Monetary Transactions" icon={Banknote} />
          <Prose>
            <p>Users may generate revenue through the platform via:</p>
            <BulletList
              items={[
                "Paid services",
                "Consulting engagements",
                "Courses",
                "Events",
                "Project-based contracts",
                "Funded quests",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">Principles</p>
            <BulletList
              items={[
                "Direct payment between parties.",
                "Transparent transaction fee (if applicable).",
                "No hidden charges.",
                "No claim of ownership over user contracts.",
                "Compliance with financial and tax regulations.",
              ]}
            />
            <p>
              Money transactions are external currency flows and are independent from XP or Credits.
            </p>
          </Prose>
        </section>

        <hr className="my-8 border-border/40" />

        {/* ───── CREDITS ───── */}
        <section>
          <SectionHeader id="credits" title="Credits" icon={Coins} />
          <Prose>
            <p>Credits are internal, non-convertible coordination units that circulate within the ecosystem.</p>
            <p className="font-semibold text-foreground">Core Properties:</p>
            <BulletList
              items={[
                "Non-convertible to fiat currency",
                "Circulate peer-to-peer within the platform",
                "Subject to 1.5% monthly demurrage (redistribution)",
                "Cannot be withdrawn, traded, or exchanged externally",
                "Do not represent ownership or financial return",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">Credits may be obtained via:</p>
            <BulletList
              items={[
                "Subscription plans",
                "Optional top-up purchases",
                "Quest allocations by providers",
                "Contribution incentives & volunteering rewards",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">Credits may be used for:</p>
            <BulletList
              items={[
                "Activating & boosting quests",
                "Unlocking advanced features",
                "Rewarding collaborators",
                "Supporting territorial initiatives",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">Demurrage (Monthly Redistribution):</p>
            <p>
              Credits are subject to a 1.5% monthly redistribution rate. Inactive balances gradually return to the Platform Treasury, 
              which reinvests them into collective quests, territorial initiatives, and ecosystem-wide development.
              This mechanism encourages circulation and prevents concentration of coordination power.
            </p>
          </Prose>
          <div className="mt-4 space-y-3">
            <CalloutBox>
              Credits ≠ Money · Credits ≠ Investment · Credits ≠ Equity
              <br />
              <span className="text-xs font-normal text-muted-foreground">
                Credits are a coordination &amp; reciprocity tool, not a financial asset.
              </span>
            </CalloutBox>
            <a href="/credit-economy" className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
              Learn more about the Credit Economy →
            </a>
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* ───── XP ───── */}
        <section>
          <SectionHeader id="xp" title="XP (Reputation)" icon={Star} />
          <Prose>
            <p>XP represents contribution-based recognition.</p>
            <p className="font-semibold text-foreground">XP:</p>
            <BulletList
              items={[
                "Has no monetary value.",
                "Cannot be purchased.",
                "Cannot be converted into credits or money.",
                "Cannot be transferred.",
                "Does not grant ownership rights.",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">XP is earned through:</p>
            <BulletList
              items={[
                "Completing quests",
                "Publishing resources",
                "Constructive participation",
                "Peer validation",
                "Collaboration",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">Purpose:</p>
            <BulletList
              items={[
                "Build trust",
                "Reflect reliability",
                "Signal contribution history",
              ]}
            />
          </Prose>
          <div className="mt-4">
            <CalloutBox>XP rewards contribution, not payment.</CalloutBox>
          </div>
        </section>

        <hr className="my-8 border-border/40" />

        {/* ───── SUSTAINABILITY ───── */}
        <section>
          <SectionHeader id="sustainability" title="Platform Sustainability" icon={TrendingUp} />
          <Prose>
            <p>The platform operates on a hybrid sustainability model:</p>
            <BulletList
              items={[
                "Transaction fees — applied only when value is created.",
                "Optional professional plans.",
                "Institutional funding.",
                "Infrastructure services (where applicable).",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">The platform does not:</p>
            <BulletList
              items={[
                "Monetize user data.",
                "Sell personal information.",
                "Rely on attention-based advertising.",
              ]}
            />
          </Prose>
        </section>

        <hr className="my-8 border-border/40" />

        {/* ───── GOVERNANCE ───── */}
        <section>
          <SectionHeader id="governance" title="Governance & Safeguards" icon={ShieldCheck} />
          <Prose>
            <p>
              The four economic layers are kept deliberately separate. The following safeguards apply:
            </p>
            <BulletList
              items={[
                "No monetization of attention.",
                "No data brokerage.",
                "Transparent updates to economic policy.",
                "Compliance with applicable regulations.",
              ]}
            />
            <p className="font-semibold text-foreground pt-2">Guiding Principles</p>
            <BulletList
              items={[
                "Transparency",
                "Proportionality",
                "Mission alignment",
                "Non-extractive design",
                "Long-term resilience",
              ]}
            />
          </Prose>
        </section>

        <div className="h-16" />
      </div>
    </PageShell>
  );
}
