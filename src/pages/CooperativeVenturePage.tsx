import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Users, Landmark, ArrowRight, CheckCircle2,
  TrendingUp, Vote, Layers, Star, Building2, Lock,
} from "lucide-react";

const CLASS_A_MAILTO =
  "mailto:pa@changethegame.xyz?subject=Class%20A%20Membership%20Application";
const CLASS_C_MAILTO =
  "mailto:pa@changethegame.xyz?subject=Class%20C%20Strategic%20Participation";

export default function CooperativeVenturePage({ embedded }: { embedded?: boolean }) {
  const content = (
    <div className={embedded ? "max-w-3xl mx-auto px-4 space-y-20" : "max-w-3xl mx-auto py-12 sm:py-20 px-4 space-y-20"}>

        {/* Hero */}
        <section className="space-y-5">
          <Badge variant="outline" className="text-xs tracking-widest uppercase font-mono">
            Coop-like Venture
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight text-foreground">
            A platform owned by the<br className="hidden sm:block" /> people who use it.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            changethegame is not just a tool. It is a shared infrastructure — built, governed, and owned
            collectively by its members. We chose a coop-like structure because the tools we use to
            collaborate should belong to the people who collaborate.
          </p>
        </section>

        <Separator />

        {/* Why coop-like */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-semibold text-foreground">Why a coop-like structure?</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: Users,
                title: "Member-owned",
                desc: "Humans who contribute shape what gets built. Ownership is earned through participation, not just capital.",
              },
              {
                icon: Vote,
                title: "Democratic governance",
                desc: "Decisions are made collectively. Governance weight is a hybrid of XP reputation and shareholding — not money alone.",
              },
              {
                icon: TrendingUp,
                title: "Surplus reinvested",
                desc: "Annual surplus is split across reinvestment, shareholders, treasury, and solidarity — never extracted for private gain.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Share classes */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">Three share classes</h2>
            <p className="text-muted-foreground mt-2">
              Each class reflects a different form of commitment — from strategic stewardship to day-to-day participation.
            </p>
          </div>

          {/* Class A */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Class A — Guardians</h3>
                <p className="text-xs text-muted-foreground">Strategic stewardship · High-conviction commitment</p>
              </div>
              <Badge className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">30–40 holders max</Badge>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Class A members are the foundational stewards of changethegame. They hold deep governance rights,
                participate in strategic decisions, and take long-term responsibility for the mission.
                Their involvement goes beyond investment — they co-define the direction of the venture.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rights</p>
                  {[
                    "Full governance voting rights",
                    "Steward Council eligibility",
                    "Strategic decision participation",
                    "Dividend eligibility (annual surplus)",
                    "Access to all assemblies & sprints",
                    "Priority input on the product roadmap",
                  ].map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Economic terms</p>
                  <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Minimum ticket</span><span className="font-semibold">€25,000</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Target range</span><span className="font-semibold">€25k – €100k</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Maximum holders</span><span className="font-semibold">30–40</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Governance weight</span><span className="font-semibold">XP + shareholding</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Access is by application only. We look for long-term alignment, not just capital.
                  </p>
                </div>
              </div>
              <a href={CLASS_A_MAILTO}>
                <Button variant="outline" className="gap-2">
                  Apply for Class A <ArrowRight className="h-4 w-4" />
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
                <h3 className="font-display font-bold text-foreground">Class B — Stewards</h3>
                <p className="text-xs text-muted-foreground">Active participation · Open to all Humans</p>
              </div>
              <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">Open access</Badge>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Class B is open to any Human on the platform who wants to go beyond using the tool — and
                actually own a piece of it. Stewards support the project financially, influence its direction,
                and participate in governance proportional to their XP level and contribution history.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rights</p>
                  {[
                    "Proportional governance voting (XP-weighted)",
                    "Access to member assemblies & gatherings",
                    "Roadmap influence and feature voting",
                    "Dividend eligibility (annual surplus)",
                    "Visibility as a platform co-owner",
                    "Early access to new features",
                  ].map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Economic terms</p>
                  <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Price per share</span><span className="font-semibold">€10</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Governance weight</span><span className="font-semibold">XP + shares held</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">XP required</span><span className="font-semibold">Level 5+ to vote</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Transferable</span><span className="font-semibold">No (mission-bound)</span></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Governance rights scale with XP: levels 5–8 unlock voting, 9–12 proposals, 13–15 council eligibility.
                  </p>
                </div>
              </div>
              <Button asChild className="gap-2">
                <Link to="/shares">
                  Join as a Class B Steward <ArrowRight className="h-4 w-4" />
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
                <h3 className="font-display font-bold text-foreground">Class C — Strategic Partners</h3>
                <p className="text-xs text-muted-foreground">Institutional · Foundations · Impact investors</p>
              </div>
              <Badge className="ml-auto bg-blue-500/10 text-blue-600 border-blue-500/20">By invitation</Badge>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Class C shares are designed for institutions, foundations, public bodies, and long-term aligned
                organizations that want to participate structurally in the platform's governance and ecosystem
                development. Not investors — infrastructure partners committed to mission resilience.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rights</p>
                  {[
                    "Governance participation & ecosystem oversight",
                    "Dividend eligibility (annual surplus)",
                    "Visibility as ecosystem partner",
                    "Strategic consultation access",
                    "Treasury oversight participation",
                    "Long-term mission co-stewardship",
                  ].map((r) => (
                    <div key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commitments</p>
                  <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                    {[
                      "Support long-term ecosystem resilience",
                      "Avoid extractive influence",
                      "Respect territorial autonomy",
                      "Protect mission integrity",
                    ].map((c) => (
                      <div key={c} className="flex items-start gap-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Not publicly tradable. Bound by mission protection clause. Requires strategic alignment review.
                  </p>
                </div>
              </div>
              <a href={CLASS_C_MAILTO}>
                <Button variant="outline" className="gap-2">
                  Request Strategic Participation <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        <Separator />

        {/* Governance */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">How governance works</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Governance weight is a hybrid of XP (non-transferable reputation earned through activity) and
              shareholding. XP is the primary gating mechanism — money alone does not grant influence.
            </p>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { levels: "Levels 1–4", right: "Participate", color: "bg-muted text-muted-foreground" },
              { levels: "Levels 5–8", right: "Comment & Vote", color: "bg-primary/10 text-primary" },
              { levels: "Levels 9–12", right: "Propose", color: "bg-amber-500/10 text-amber-600" },
              { levels: "Levels 13–15", right: "Steward Council", color: "bg-blue-500/10 text-blue-600" },
            ].map(({ levels, right, color }) => (
              <div key={levels} className={`rounded-xl border border-border p-4 text-center space-y-1 ${color}`}>
                <p className="text-xs font-mono font-semibold">{levels}</p>
                <p className="text-sm font-medium">{right}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            XP never decays and cannot be purchased. A +10% XP bonus applies to contributions made outside a member's primary territory, incentivising cross-ecosystem activity.
          </p>
        </section>

        <Separator />

        {/* Surplus */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-foreground">Where the surplus goes</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Annual surplus is never extracted. It is redistributed across four pools defined by member governance.
            </p>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { pct: "40%", label: "Reinvestment", desc: "Platform development & infrastructure", icon: Layers },
              { pct: "30%", label: "Shareholders", desc: "Dividend distribution to all share classes", icon: TrendingUp },
              { pct: "20%", label: "Ecosystem Treasury", desc: "Collective reserves & commons funding", icon: Landmark },
              { pct: "10%", label: "Solidarity Fund", desc: "Support for under-resourced members", icon: Users },
            ].map(({ pct, label, desc, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-2xl font-display font-bold text-foreground">{pct}</p>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Where contributions go */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-foreground">What your contribution funds</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Infrastructure & hosting for the global platform",
              "AI development reinforcing collective intelligence",
              "Territorial intelligence & memory tools",
              "Community support, assemblies & gatherings",
              "New features shaped by members' needs",
              "Solidarity support for under-resourced Humans",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/90">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4">
          <h2 className="text-xl font-display font-bold text-foreground">
            Ready to become a co-owner?
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            We're building this with you, for you, and ultimately owned by you.
            Choose your level of commitment and join the venture.
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Button asChild className="gap-2">
              <Link to="/shares">Join as Class B Steward <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={CLASS_A_MAILTO}>Apply for Class A</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href={CLASS_C_MAILTO}>Strategic Partnership (C)</a>
            </Button>
          </div>
        </section>

      </div>
  );
  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}
