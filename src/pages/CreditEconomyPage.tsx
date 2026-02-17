import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Banknote, Coins, Star, ShieldCheck, Recycle, Building2, Info, Scale } from "lucide-react";
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

export default function CreditEconomyPage() {
  return (
    <PageShell>
      <title>Internal Credit Economy — changethegame</title>
      <meta name="description" content="How the three-layer value system works: Fiat, Credits, and XP. Non-convertible credits with demurrage redistribution." />

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">Internal Credit Economy</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Understanding the three value layers that power the ecosystem: real currency, internal credits, and reputation.
          </p>
        </header>

        {/* ── Three Layers ── */}
        <SectionHeader title="The Three Value Layers" icon={Scale} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {ECONOMY_LAYERS.map((layer) => {
            const IconMap: Record<string, React.ElementType> = { Banknote, Coins, Star };
            const Icon = IconMap[layer.icon] || Coins;
            return (
              <Card key={layer.key} className="border-border/50 bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-sm">{layer.label}</h3>
                  </div>
                  <Badge variant={layer.convertible ? "default" : "secondary"} className="text-[10px]">
                    {layer.convertible ? "Convertible" : "Non-convertible"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{layer.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <CalloutBox>
          Fiat = Real economy · Credits = Internal coordination · XP = Reputation &amp; governance
          <br />
          <span className="text-muted-foreground font-normal text-xs">These three layers are intentionally separated. They do not overlap.</span>
        </CalloutBox>

        <Separator className="my-8" />

        {/* ── Credits Deep Dive ── */}
        <SectionHeader title="Credits: Circulating Coordination" icon={Recycle} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Credits are a <strong className="text-foreground">non-convertible internal coordination unit</strong> designed to facilitate participation, visibility, and collaborative activation.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Credits are earned via:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Monthly subscription plans</li>
                <li>Optional top-up purchases</li>
                <li>Quest allocations by providers</li>
                <li>Volunteering & contribution rewards</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Credits are used for:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Activating & boosting quests</li>
                <li>Accessing premium features</li>
                <li>Rewarding collaborators</li>
                <li>Supporting territorial initiatives</li>
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* ── Demurrage ── */}
        <SectionHeader title="Monthly Redistribution (Demurrage)" icon={Recycle} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            To prevent hoarding and encourage active circulation, Credits are subject to a monthly redistribution rate of <strong className="text-foreground">{DEMURRAGE_RATE_PERCENT}</strong>.
          </p>
          <p>This mechanism ensures that inactive value returns to active community use through the Platform Treasury.</p>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Example: 1,000 Credits over 12 months</p>
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
              After 12 months of inactivity: ~{decay[12]} credits remain (≈{Math.round((1 - decay[12] / 1000) * 100)}% redistributed)
            </p>
          </div>

          <CalloutBox>
            Demurrage is not a penalty — it is a structural incentive to activate and circulate value.
            <br />
            <span className="text-muted-foreground font-normal text-xs">Active contributors naturally neutralize fade through earning.</span>
          </CalloutBox>
        </div>

        <Separator className="my-8" />

        {/* ── Treasury ── */}
        <SectionHeader title="Platform Treasury" icon={Building2} />
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>Credits reduced through demurrage are redirected to the Platform Treasury.</p>
          <p>The Treasury reinvests these Credits into:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Collective quests & territorial initiatives</li>
            <li>Ecosystem-wide development</li>
            <li>AI-driven public goods</li>
          </ul>
          <p className="text-xs">All Treasury movements are logged and publicly visible in the Economy Dashboard below.</p>
        </div>

        <Separator className="my-8" />

        {/* ── Live Dashboard ── */}
        <SectionHeader title="Economy Dashboard" icon={Info} />
        <EconomyDashboard />

        <Separator className="my-8" />

        {/* ── Legal Disclaimer ── */}
        <SectionHeader title="Legal Disclaimer" icon={ShieldCheck} />
        <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground text-sm">Legal Nature of Credits</p>
          <p>Credits are an internal, non-convertible coordination unit used exclusively within the changethegame platform.</p>
          <p>Credits do not constitute electronic money, do not represent a financial instrument, do not grant ownership, equity, or securities rights, are not redeemable for fiat currency, and cannot be withdrawn or exchanged outside the platform.</p>
          
          <p className="font-semibold text-foreground text-sm pt-2">No Monetary Value</p>
          <p>Credits have no intrinsic monetary value and are not intended to function as currency. The purchase of subscription plans or top-ups grants access to platform features and allocates internal Credits. Such purchases do not constitute the acquisition of a financial asset.</p>
          
          <p className="font-semibold text-foreground text-sm pt-2">Demurrage and Redistribution</p>
          <p>Credits are subject to a monthly redistribution mechanism (currently {DEMURRAGE_RATE_PERCENT}) applied to inactive balances. This is a structural feature of the internal coordination system, not a fee, penalty, or financial charge. Redistributed Credits are allocated to the Platform Treasury for collective initiatives.</p>
          
          <p className="font-semibold text-foreground text-sm pt-2">Platform Authority</p>
          <p>changethegame reserves the right to modify Credit mechanics, adjust redistribution rates, prevent abuse or manipulation, and suspend accounts engaging in exploitative behaviour. All changes will be communicated transparently.</p>
          
          <p className="font-semibold text-foreground text-sm pt-2">Separation from Fiat Transactions</p>
          <p>All financial transactions involving services, missions, or fundraising are conducted in fiat currency through regulated payment providers. Credits are not linked to financial returns and do not guarantee economic benefit.</p>
        </div>

        <div className="h-16" />
      </div>
    </PageShell>
  );
}
