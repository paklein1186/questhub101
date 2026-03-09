import { useTranslation } from "react-i18next";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Banknote, Coins, Star, ShieldCheck, Recycle, Building2, Info, Scale, Compass, Sprout } from "lucide-react";
import { DEMURRAGE_RATE_PERCENT, ECONOMY_LAYERS, simulateDecay } from "@/lib/demurrageConfig";
import { EconomyDashboard } from "@/components/EconomyDashboard";

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 mb-4 pt-8 first:pt-0">
      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function CalloutBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm font-semibold text-foreground leading-relaxed">
      {children}
    </div>
  );
}

const decay = simulateDecay(1000, 12);

export default function CreditEconomyPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const creditsEarnedItems = t("creditEconomyPage.creditsEarnedItems", { returnObjects: true }) as string[];
  const creditsSpentItems = t("creditEconomyPage.creditsSpentItems", { returnObjects: true }) as string[];

  const content = (
    <>
      <title>Hybrid Sovereign Economy — changethegame</title>
      <meta name="description" content="How the four-layer value system works: Fiat, Credits, XP, and Shares. A hybrid regenerative coordination layer." />

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">{t("creditEconomyPage.title")}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t("creditEconomyPage.subtitle")}</p>
        </header>

        {/* Four Layers */}
        <SectionHeader title={t("creditEconomyPage.fourLayers")} icon={Scale} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {ECONOMY_LAYERS.map((layer) => {
            const IconMap: Record<string, React.ElementType> = { Banknote, Coins, Star, Compass, Sprout };
            const Icon = IconMap[layer.icon] || Coins;
            return (
              <Card key={layer.key} className="border-border/50 bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-sm">{layer.label}</h3>
                  </div>
                  <Badge variant={layer.convertible ? "default" : "secondary"} className="text-[10px]">
                    {layer.convertible ? t("creditEconomyPage.convertible") : t("creditEconomyPage.nonConvertible")}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{layer.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <CalloutBox>
          ⭐ XP tracks <strong>who you are</strong> — permanent, individual, non-transferable.{" "}
          🌱 $CTG tracks <strong>what you produce for the commons</strong> — circulatory, collective, fades 1%/month.{" "}
          These two systems are complementary, not competing.
        </CalloutBox>

        <CalloutBox>
          {t("creditEconomyPage.calloutLayers")}
          <br />
          <span className="text-muted-foreground font-normal text-xs">{t("creditEconomyPage.calloutLayersSub")}</span>
        </CalloutBox>

        <Separator className="my-8" />

        {/* Credits Deep Dive */}
        <SectionHeader title={t("creditEconomyPage.creditsDeepDive")} icon={Recycle} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p dangerouslySetInnerHTML={{ __html: t("creditEconomyPage.creditsIntro") }} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">{t("creditEconomyPage.creditsEarnedBy")}</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {Array.isArray(creditsEarnedItems) && creditsEarnedItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">{t("creditEconomyPage.creditsSpentOn")}</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {Array.isArray(creditsSpentItems) && creditsSpentItems.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <p className="font-medium text-foreground">{t("creditEconomyPage.creditsMustFeel")}</p>
        </div>

        <Separator className="my-8" />

        {/* Demurrage */}
        <SectionHeader title={t("creditEconomyPage.fadeTitle")} icon={Recycle} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p dangerouslySetInnerHTML={{ __html: t("creditEconomyPage.fadeIntro", { rate: DEMURRAGE_RATE_PERCENT }) }} />
          <p>{t("creditEconomyPage.fadeExplain")}</p>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3">{t("creditEconomyPage.fadeExample")}</p>
            <div className="flex items-end gap-1 h-24">
              {decay.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/60 rounded-t-sm transition-all"
                    style={{ height: `${(val / 1000) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{i === 0 ? "Now" : `M${i}`}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              {t("creditEconomyPage.fadeResult", { remaining: decay[12], percent: Math.round((1 - decay[12] / 1000) * 100) })}
            </p>
          </div>

          <CalloutBox>
            {t("creditEconomyPage.fadeCallout")}
            <br />
            <span className="text-muted-foreground font-normal text-xs">{t("creditEconomyPage.fadeCalloutSub")}</span>
          </CalloutBox>
        </div>

        <Separator className="my-8" />

        {/* Ecosystem Treasury */}
        <SectionHeader title={t("creditEconomyPage.treasuryTitle")} icon={Building2} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>{t("creditEconomyPage.treasuryIntro")}</p>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3">{t("creditEconomyPage.treasuryAllocation")}</p>
            <div className="space-y-2">
              <AllocationBar label={t("creditEconomyPage.treasuryReinvestment")} percent={40} />
              <AllocationBar label={t("creditEconomyPage.treasuryShareholder")} percent={30} />
              <AllocationBar label={t("creditEconomyPage.treasuryEcosystem")} percent={20} />
              <AllocationBar label={t("creditEconomyPage.treasurySolidarity")} percent={10} />
            </div>
          </div>

          <p>{t("creditEconomyPage.treasuryMaySupport")}</p>
          <p className="font-medium text-foreground">{t("creditEconomyPage.treasuryConnects")}</p>
        </div>

        <Separator className="my-8" />

        {/* Live Dashboard */}
        <SectionHeader title={t("creditEconomyPage.dashboardTitle")} icon={Info} />
        <EconomyDashboard />

        <Separator className="my-8" />

        {/* Legal Disclaimer */}
        <SectionHeader title={t("creditEconomyPage.legalTitle")} icon={ShieldCheck} />
        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-sm">{t("creditEconomyPage.legalNature")}</p>
          <p>{t("creditEconomyPage.legalNatureP")}</p>
          <p>{t("creditEconomyPage.legalNoConvert")}</p>

          <p className="font-semibold text-foreground text-sm pt-2">{t("creditEconomyPage.legalNoValue")}</p>
          <p>{t("creditEconomyPage.legalNoValueP")}</p>

          <p className="font-semibold text-foreground text-sm pt-2">{t("creditEconomyPage.legalDemurrage")}</p>
          <p>{t("creditEconomyPage.legalDemurrageP", { rate: DEMURRAGE_RATE_PERCENT })}</p>

          <p className="font-semibold text-foreground text-sm pt-2">{t("creditEconomyPage.legalAuthority")}</p>
          <p>{t("creditEconomyPage.legalAuthorityP")}</p>

          <p className="font-semibold text-foreground text-sm pt-2">{t("creditEconomyPage.legalSeparation")}</p>
          <p>{t("creditEconomyPage.legalSeparationP")}</p>

          <p className="font-semibold text-foreground text-sm pt-2">{t("creditEconomyPage.legalNotSpeculative")}</p>
          <p>{t("creditEconomyPage.legalNotSpeculativeP")}</p>
        </div>

        <div className="h-16" />
      </div>
    </>
  );
  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}

function AllocationBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-right text-xs font-bold text-foreground">{percent}%</div>
      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs min-w-[140px]">{label}</span>
    </div>
  );
}
