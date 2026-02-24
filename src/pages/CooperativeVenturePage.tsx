import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import {
  Shield, Users, Landmark, ArrowRight, CheckCircle2,
  TrendingUp, Vote, Layers, Star, Building2, Lock,
} from "lucide-react";

const CLASS_A_MAILTO =
  "mailto:pa@changethegame.xyz?subject=Class%20A%20Membership%20Application";
const CLASS_C_MAILTO =
  "mailto:pa@changethegame.xyz?subject=Class%20C%20Strategic%20Participation";

const WHY_ICONS = [Users, Vote, TrendingUp];
const SURPLUS_ICONS = [Layers, TrendingUp, Landmark, Users];
const GOV_COLORS = [
  "bg-muted text-muted-foreground",
  "bg-primary/10 text-primary",
  "bg-amber-500/10 text-amber-600",
  "bg-blue-500/10 text-blue-600",
];

export default function CooperativeVenturePage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const whyCards = t("cooperativeVenturePage.whyCards", { returnObjects: true }) as { title: string; desc: string }[];
  const classARights = t("cooperativeVenturePage.classARights", { returnObjects: true }) as string[];
  const classBRights = t("cooperativeVenturePage.classBRights", { returnObjects: true }) as string[];
  const classCRights = t("cooperativeVenturePage.classCRights", { returnObjects: true }) as string[];
  const classCCommitments = t("cooperativeVenturePage.classCCommitments", { returnObjects: true }) as string[];
  const govLevels = t("cooperativeVenturePage.govLevels", { returnObjects: true }) as { levels: string; right: string }[];
  const surplusPools = t("cooperativeVenturePage.surplusPools", { returnObjects: true }) as { pct: string; label: string; desc: string }[];
  const contributionItems = t("cooperativeVenturePage.contributionItems", { returnObjects: true }) as string[];

  const content = (
    <div className={embedded ? "max-w-3xl mx-auto px-4 space-y-20" : "max-w-3xl mx-auto py-12 sm:py-20 px-4 space-y-20"}>

        {/* Hero */}
        <section className="space-y-5">
          <Badge variant="outline" className="text-xs tracking-widest uppercase font-mono">
            {t("cooperativeVenturePage.badge")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight text-foreground">
            {t("cooperativeVenturePage.heroTitle")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {t("cooperativeVenturePage.heroDesc")}
          </p>
        </section>

        <Separator />

        {/* Why coop-like */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-semibold text-foreground">{t("cooperativeVenturePage.whyTitle")}</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {Array.isArray(whyCards) && whyCards.map((card, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* Share classes */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">{t("cooperativeVenturePage.shareClassesTitle")}</h2>
            <p className="text-muted-foreground mt-2">{t("cooperativeVenturePage.shareClassesSubtitle")}</p>
          </div>

          {/* Class A */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">{t("cooperativeVenturePage.classATitle")}</h3>
                <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.classASub")}</p>
              </div>
              <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">{t("cooperativeVenturePage.classABadge")}</Badge>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{t("cooperativeVenturePage.classADesc")}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cooperativeVenturePage.rights")}</p>
                  {Array.isArray(classARights) && classARights.map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cooperativeVenturePage.economicTerms")}</p>
                  <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classAMinTicket")}</span><span className="font-semibold">{t("cooperativeVenturePage.classAMinTicketVal")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classATargetRange")}</span><span className="font-semibold">{t("cooperativeVenturePage.classATargetRangeVal")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classAMaxHolders")}</span><span className="font-semibold">{t("cooperativeVenturePage.classAMaxHoldersVal")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classAGovWeight")}</span><span className="font-semibold">{t("cooperativeVenturePage.classAGovWeightVal")}</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.classAAccessNote")}</p>
                </div>
              </div>
              <a href={CLASS_A_MAILTO}>
                <Button variant="outline" className="gap-2">
                  {t("cooperativeVenturePage.applyClassA")} <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>

          {/* Class B */}
          <div className="rounded-2xl border border-primary/30 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-primary/20 bg-primary/5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">{t("cooperativeVenturePage.classBTitle")}</h3>
                <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.classBSub")}</p>
              </div>
              <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">{t("cooperativeVenturePage.classBBadge")}</Badge>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{t("cooperativeVenturePage.classBDesc")}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cooperativeVenturePage.rights")}</p>
                  {Array.isArray(classBRights) && classBRights.map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cooperativeVenturePage.economicTerms")}</p>
                  <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classBPrice")}</span><span className="font-semibold">{t("cooperativeVenturePage.classBPriceVal")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classBGovWeight")}</span><span className="font-semibold">{t("cooperativeVenturePage.classBGovWeightVal")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classBXPReq")}</span><span className="font-semibold">{t("cooperativeVenturePage.classBXPReqVal")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">{t("cooperativeVenturePage.classBTransfer")}</span><span className="font-semibold">{t("cooperativeVenturePage.classBTransferVal")}</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.classBGovNote")}</p>
                </div>
              </div>
              <Button asChild className="gap-2">
                <Link to="/shares">
                  {t("cooperativeVenturePage.joinClassB")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Class C */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">{t("cooperativeVenturePage.classCTitle")}</h3>
                <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.classCSub")}</p>
              </div>
              <Badge className="ml-auto bg-blue-500/10 text-blue-600 border-blue-500/20">{t("cooperativeVenturePage.classCBadge")}</Badge>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{t("cooperativeVenturePage.classCDesc")}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cooperativeVenturePage.rights")}</p>
                  {Array.isArray(classCRights) && classCRights.map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("cooperativeVenturePage.commitments")}</p>
                  <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                    {Array.isArray(classCCommitments) && classCCommitments.map((c) => (
                      <div key={c} className="flex items-start gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.classCNote")}</p>
                </div>
              </div>
              <a href={CLASS_C_MAILTO}>
                <Button variant="outline" className="gap-2">
                  {t("cooperativeVenturePage.requestClassC")} <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        <Separator />

        {/* Governance */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">{t("cooperativeVenturePage.governanceTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t("cooperativeVenturePage.governanceDesc")}</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            {Array.isArray(govLevels) && govLevels.map((g, i) => (
              <div key={i} className={`rounded-xl border border-border p-4 text-center space-y-1 ${GOV_COLORS[i]}`}>
                <p className="text-xs font-mono font-semibold">{g.levels}</p>
                <p className="text-sm font-medium">{g.right}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("cooperativeVenturePage.govXPNote")}</p>
        </section>

        <Separator />

        {/* Surplus */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">{t("cooperativeVenturePage.surplusTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("cooperativeVenturePage.surplusDesc")}</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            {Array.isArray(surplusPools) && surplusPools.map((pool, i) => {
              const Icon = SURPLUS_ICONS[i];
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <p className="text-2xl font-display font-bold text-foreground">{pool.pct}</p>
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{pool.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{pool.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Separator />

        {/* Where contributions go */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">{t("cooperativeVenturePage.contributionTitle")}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.isArray(contributionItems) && contributionItems.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/90">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4">
          <h2 className="text-xl font-display font-bold text-foreground">{t("cooperativeVenturePage.ctaTitle")}</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{t("cooperativeVenturePage.ctaDesc")}</p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild className="gap-2">
              <Link to="/shares">{t("cooperativeVenturePage.ctaClassB")} <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={CLASS_A_MAILTO}>{t("cooperativeVenturePage.ctaClassA")}</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={CLASS_C_MAILTO}>{t("cooperativeVenturePage.ctaClassC")}</a>
            </Button>
          </div>
        </section>

      </div>
  );
  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}
