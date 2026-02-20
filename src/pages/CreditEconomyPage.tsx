import { PageShell } from "@/components/PageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Banknote, Coins, Star, ShieldCheck, Recycle, Building2, Info, Scale, Compass } from "lucide-react";
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
  const content = (
    <>
      <title>Hybrid Sovereign Economy — changethegame</title>
      <meta name="description" content="How the four-layer value system works: Fiat, Credits, XP, and Shares. A hybrid regenerative coordination layer." />

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">Hybrid Sovereign Economy</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Understanding the four value layers that power the ecosystem: fiat currency, collaboration credits, reputation, and stewardship shares.
          </p>
        </header>

        {/* ── Four Layers ── */}
        <SectionHeader title="The Four Value Layers" icon={Scale} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {ECONOMY_LAYERS.map((layer) => {
            const IconMap: Record<string, React.ElementType> = { Banknote, Coins, Star, Compass };
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
          💶 Fiat = Real economy · 🪙 Credits = Collaboration fuel · ⭐ XP = Reputation · 🧭 Shares = Stewardship
          <br />
          <span className="text-muted-foreground font-normal text-xs">These four layers are intentionally separated. They do not overlap or convert into each other.</span>
        </CalloutBox>

        <Separator className="my-8" />

        {/* ── Credits Deep Dive ── */}
        <SectionHeader title="Credits: Collaboration Fuel" icon={Recycle} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>Credits reward contribution beyond financial exchange. They are a <strong className="text-foreground">non-convertible internal coordination unit</strong> designed to facilitate participation and collaborative activation.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Credits are earned by:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Completing volunteer missions</li>
                <li>Helping without fiat transaction</li>
                <li>Publishing high-value content (admin-weighted)</li>
                <li>Onboarding organizations</li>
                <li>Activating territories</li>
                <li>Small universal monthly mint (all active users)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-semibold text-foreground mb-2">Credits are spent on:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Boosting quest visibility</li>
                <li>Reduced commission token (single mission)</li>
                <li>Advanced AI territory insights</li>
                <li>Highlighting profile</li>
                <li>Submitting governance proposals</li>
                <li>Event discounts & territory premium tools</li>
              </ul>
            </div>
          </div>

          <p className="font-medium text-foreground">Credits must feel useful but not financial.</p>
        </div>

        <Separator className="my-8" />

        {/* ── Demurrage ── */}
        <SectionHeader title="Monthly Redistribution (Fade)" icon={Recycle} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            To prevent hoarding and encourage active circulation, Credits gently fade by <strong className="text-foreground">{DEMURRAGE_RATE_PERCENT}</strong> per month.
          </p>
          <p>This mechanism ensures that inactive value returns to active community use through the Ecosystem Treasury.</p>

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

        {/* ── Ecosystem Treasury ── */}
        <SectionHeader title="Ecosystem Treasury" icon={Building2} />
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>A portion of platform surplus supports territorial and regenerative initiatives.</p>
          
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Annual allocation model:</p>
            <div className="space-y-2">
              <AllocationBar label="Reinvestment reserve" percent={40} />
              <AllocationBar label="Shareholder distribution" percent={30} />
              <AllocationBar label="Ecosystem treasury" percent={20} />
              <AllocationBar label="Solidarity & new territories" percent={10} />
            </div>
          </div>

          <p>Treasury funds may support: new territorial hubs, residencies, regenerative missions, and collective innovation projects.</p>
          <p className="font-medium text-foreground">This connects marketplace success to ecosystem growth.</p>
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
          <p>Credits are subject to a monthly redistribution mechanism (currently {DEMURRAGE_RATE_PERCENT}) applied to inactive balances. This is a structural feature of the internal coordination system, not a fee, penalty, or financial charge. Redistributed Credits are allocated to the Ecosystem Treasury for collective initiatives.</p>
          
          <p className="font-semibold text-foreground text-sm pt-2">Platform Authority</p>
          <p>changethegame reserves the right to modify Credit mechanics, adjust redistribution rates, prevent abuse or manipulation, and suspend accounts engaging in exploitative behaviour. All changes will be communicated transparently.</p>
          
          <p className="font-semibold text-foreground text-sm pt-2">Separation from Fiat Transactions</p>
          <p>All financial transactions involving services, missions, or fundraising are conducted in fiat currency through regulated payment providers. Credits are not linked to financial returns and do not guarantee economic benefit.</p>

          <p className="font-semibold text-foreground text-sm pt-2">Not a Speculative Platform</p>
          <p>changethegame is not a token platform. It is a coordination infrastructure designed to operate within current economic systems while preparing long-term regenerative alternatives. No crypto logic, no token speculation.</p>
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
