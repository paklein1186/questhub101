import { ContentPageShell } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Users, Zap, Shield, Leaf, Coins, BarChart3, Scale, Heart,
  Network, Target, FileText, ArrowRight, Globe, Sparkles, Activity
} from "lucide-react";

interface Props {
  embedded?: boolean;
}

// ── Live stats hook ─────────────────────────────────────────
function useOVNStats() {
  return useQuery({
    queryKey: ["ovn-page-stats"],
    staleTime: 60_000,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [tokensRes, questsRes, contribRes, guildsRes] = await Promise.all([
        supabase.from("coin_transactions" as any).select("amount").eq("type", "quest_payout"),
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("value_pie_calculated", true as any),
        supabase.from("contribution_logs" as any).select("user_id").gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("guilds").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      ]);

      const totalTokens = ((tokensRes.data as any[]) || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);
      const questCount = questsRes.count || 0;
      const distinctUsers = new Set(((contribRes.data as any[]) || []).map((r: any) => r.user_id)).size;
      const guildCount = guildsRes.count || 0;

      return { totalTokens, questCount, distinctUsers, guildCount };
    },
  });
}

// ── Recent value-pie quests hook ────────────────────────────
function useRecentValuePieQuests() {
  return useQuery({
    queryKey: ["ovn-recent-vp-quests"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, created_at, coin_budget")
        .eq("value_pie_calculated", true as any)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data || []) as { id: string; title: string; created_at: string; coin_budget: number }[];
    },
  });
}

export default function OpenValueNetworkPage({ embedded }: Props) {
  const { data: stats } = useOVNStats();
  const { data: recentQuests } = useRecentValuePieQuests();

  return (
    <ContentPageShell
      title="CTG Open Value System"
      subtitle="A new way to recognise, reward, and coordinate meaningful work."
      backTo="/ecosystem"
      backLabel="Ecosystem"
      embedded={embedded}
    >
      <div className="space-y-12 text-sm leading-relaxed">

        {/* Intro */}
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-base text-foreground">
            ChangeTheGame introduces an <strong>Open Value System</strong>: a transparent, ecosystem-wide mechanism
            that tracks contributions, distributes value fairly, and aligns talents, territories, guilds, and natural
            ecosystems around shared outcomes — not hierarchy.
          </p>
          <p className="text-muted-foreground mt-3">This page explains, in one view, how value circulates.</p>
        </section>

        {/* ── PART A: Live Stats ── */}
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              OVN en temps réel
            </h2>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
               Real-time data
             </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="$CTG distributed" value={stats?.totalTokens ?? 0} icon="🟩" />
            <StatCard label="Value Pie Quests" value={stats?.questCount ?? 0} icon="🥧" />
            <StatCard label="Contributors this month" value={stats?.distinctUsers ?? 0} icon="👥" />
            <StatCard label="Active guilds" value={stats?.guildCount ?? 0} icon="⚔️" />
          </div>
        </section>

        {/* 1. Nodes */}
        <Section
          number="1"
          title="Every Actor Becomes a Node of Value"
          icon={<Network className="h-5 w-5" />}
        >
          <p>In CTG, each participant is represented as a <strong>node</strong>:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {[
              { label: "Individuals", desc: "talents, experts, citizens" },
              { label: "Guilds", desc: "communities of practice" },
              { label: "Entities", desc: "projects, associations, businesses" },
              { label: "Territories", desc: "municipalities, bioregions" },
              { label: "Living Systems", desc: "forests, rivers, soils" },
            ].map((n) => (
              <div key={n.label} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4">Each node carries:</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
            {[
              { icon: <Zap className="h-4 w-4 text-primary" />, label: "XP", desc: "Skills & progression" },
              { icon: <Shield className="h-4 w-4 text-primary" />, label: "Trust Index", desc: "Reliability" },
              { icon: <Coins className="h-4 w-4 text-primary" />, label: "🔷 Platform Credits", desc: "Feature fuel" },
              { icon: <Leaf className="h-4 w-4 text-primary" />, label: "🌱 $CTG", desc: "Contribution to commons" },
              { icon: <FileText className="h-4 w-4 text-primary" />, label: "History", desc: "Proof of work" },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                {v.icon}
                <div>
                  <p className="text-xs font-medium">{v.label}</p>
                  <p className="text-[10px] text-muted-foreground">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs italic">
            This creates a living map of capacity, reliability, and impact.
          </p>
        </Section>

        {/* 2. Quests */}
        <Section
          number="2"
          title="Quests: the Core Unit of Work"
          icon={<Target className="h-5 w-5" />}
        >
          <p>A <strong>Quest</strong> is a structured micro-contract used to describe a need, assign roles, fund the mission, track contributions, and measure outcomes.</p>
          <p className="mt-3">Because quests are pre-funded and governed by safety rules, contributors always know:</p>
          <ul className="mt-2 space-y-1 list-none">
            {[
              "What is expected",
              "How much they'll earn",
              "How success is evaluated",
              "How disputes are resolved",
              "How impact is measured",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-medium text-foreground">Quests create the atomic flow of value inside the network.</p>
        </Section>

        {/* 3. Triple Value */}
        <Section
          number="3"
          title="Measuring Value Across 3 Dimensions"
          icon={<BarChart3 className="h-5 w-5" />}
        >
          <p>CTG captures value along a triple axis:</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <ValueCard
              title="A. Skills (XP)"
              color="text-primary"
              desc="Every task increases expertise through guild-aligned XP."
              icon={<Zap className="h-5 w-5" />}
            />
            <ValueCard
              title="B. Trust"
              color="text-primary"
              desc="Interactions strengthen (or weaken) relational bonds between actors."
              icon={<Shield className="h-5 w-5" />}
            />
            <ValueCard
              title="C. Impact"
              color="text-primary"
              desc="Outcomes evaluated through ecological indicators, social contribution, community regeneration, and knowledge creation."
              icon={<Leaf className="h-5 w-5" />}
            />
          </div>
          <p className="mt-3 text-muted-foreground">
            Together, <strong className="text-foreground">XP + Trust + Impact</strong> form a <strong className="text-foreground">Value Score</strong>, used across the system.
          </p>
        </Section>

        {/* 4. Dual Currency */}
        <Section
          number="4"
          title="Dual Currency: Platform Credits & $CTG"
          icon={<Coins className="h-5 w-5" />}
        >
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="font-medium text-foreground mb-2">🔷 Platform Credits (non-monetary)</p>
              <p className="text-xs text-muted-foreground mb-2">Feature fuel for gamification, quotas, boosts. Cannot be withdrawn.</p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                {["Monthly plan allocation", "Top-up purchases", "Creating quests beyond quota", "Boosting visibility", "Gamified actions & streaks"].map((s) => (
                  <li key={s} className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-primary shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="font-medium text-foreground mb-2">🟩 $CTG (fiat-backed)</p>
              <p className="text-xs text-muted-foreground mb-2">Mission value. Backed by real fiat. Withdrawable by contributors.</p>
              <ul className="space-y-1 text-muted-foreground text-xs">
                {["Pre-funded quest budgets", "Contributor payouts", "Guild/Territory redistribution", "Ecological impact flows", "Fiat withdrawal via Stripe Connect"].map((s) => (
                  <li key={s} className="flex items-center gap-1.5"><ArrowRight className="h-3 w-3 text-emerald-500 shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 font-medium text-foreground">Two systems, fully separated. Platform Credits never mix with $CTG.</p>
        </Section>

        {/* ── PART B: Animated Token Flow Diagram ── */}
        <Section
          number="5"
          title="Transparent Redistribution"
          icon={<BarChart3 className="h-5 w-5" />}
        >
          <p>At the end of each quest, $CTG automatically split into:</p>
          <div className="mt-6">
            <TokenFlowDiagram />
          </div>
          <p className="mt-4 text-muted-foreground italic">
            No hidden fees. No negotiation. No power games.<br />
            Value = shared, visible, and fair.
          </p>
        </Section>

        {/* 6. Governance */}
        <Section
          number="6"
          title="Governance Anchored in Community"
          icon={<Scale className="h-5 w-5" />}
        >
          <p>CTG uses multi-layer governance to ensure fairness:</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: "Peer Resolution", desc: "Fast, contextual" },
              { label: "Guild Arbitration", desc: "Skills-based" },
              { label: "Territorial Governance", desc: "Strategic" },
              { label: "CTG Council", desc: "Final decision" },
            ].map((g, i) => (
              <div key={g.label} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                <Badge variant="outline" className="text-xs py-1 px-2">
                  {g.label}
                  <span className="text-muted-foreground ml-1">({g.desc})</span>
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted-foreground">
            This prevents exploitation, ghosting, unclear decisions, and top-down capture.
            The network remains <strong className="text-foreground">safe, transparent, and distributed</strong>.
          </p>
        </Section>

        {/* 7. Living Systems */}
        <Section
          number="7"
          title="Living Systems as First-Class Citizens"
          icon={<Leaf className="h-5 w-5" />}
        >
          <p>
            Territories can connect real ecological indicators (sensors, monitoring data) to quests, dashboards, and governance decisions.
          </p>
          <p className="mt-2 text-muted-foreground">
            If a forest dries, or a river's health declines → CTG can automatically generate ecological quests and mobilise guilds.
          </p>
          <p className="mt-2 font-medium text-foreground">This creates true bioregional intelligence.</p>
        </Section>

        {/* 8. Why It Matters */}
        <Section
          number="8"
          title="Why It Matters"
          icon={<Globe className="h-5 w-5" />}
        >
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {[
              "Reveal invisible work",
              "Fund what truly matters",
              "Create fair economies in communities",
              "Support contributors with safety",
              "Empower territories with new capacities",
              "Connect human decisions with ecological signals",
            ].map((p) => (
              <div key={p} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted-foreground">
            It's not a marketplace. It's not a job board.<br />
            It's a <strong className="text-foreground">distributed infrastructure for collective intelligence and regenerative action</strong>.
          </p>
        </Section>

        {/* 9. Promise */}
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <Heart className="h-8 w-8 text-primary mx-auto" />
          <div className="space-y-1 text-base font-display">
            <p>When value becomes visible, <strong>collaboration becomes natural</strong>.</p>
            <p>When value flows fairly, <strong>ecosystems regenerate</strong>.</p>
            <p>When ecosystems regenerate, <strong>communities thrive</strong>.</p>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            This is what the CTG Open Value System is built for.
          </p>
        </section>

        {/* ── PART C: Recent Value Pie Quests ── */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Quêtes récentes avec Value Pie
          </h2>
          {recentQuests && recentQuests.length > 0 ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {recentQuests.map((q) => (
                <Link
                  key={q.id}
                  to={`/quests/${q.id}`}
                  className="rounded-lg border border-border bg-muted/30 p-4 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {q.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{format(new Date(q.created_at), "dd MMM yyyy")}</span>
                    {q.coin_budget > 0 && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                        🟩 {q.coin_budget}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              Les premières quêtes distribuées apparaîtront ici.
            </p>
          )}
        </section>
      </div>
    </ContentPageShell>
  );
}

// ── Stat card ───────────────────────────────────────────────
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center space-y-1">
      <span className="text-lg">{icon}</span>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

// ── Token Flow Diagram ──────────────────────────────────────
const FLOW_NODES = [
  { label: "Contributeurs", pct: 60, angle: -90, color: "hsl(var(--primary))" },
  { label: "Guilde", pct: 15, angle: -30, color: "hsl(var(--primary))" },
  { label: "Territoire", pct: 10, angle: 30, color: "hsl(var(--primary))" },
  { label: "CTG", pct: 10, angle: 150, color: "hsl(var(--primary))" },
  { label: "Système Vivant", pct: 5, angle: 210, color: "hsl(var(--primary))" },
];

function TokenFlowDiagram() {
  const cx = 200, cy = 160, r = 120;

  return (
    <div className="flex justify-center">
      <div className="relative" style={{ width: 400, height: 320 }}>
        <svg viewBox="0 0 400 320" className="w-full h-full" aria-label="Token flow diagram">
          <style>{`
            @keyframes travel {
              0% { offset-distance: 0%; opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { offset-distance: 100%; opacity: 0; }
            }
          `}</style>
          {FLOW_NODES.map((node, i) => {
            const rad = (node.angle * Math.PI) / 180;
            const tx = cx + r * Math.cos(rad);
            const ty = cy + r * Math.sin(rad);
            const pathId = `flow-path-${i}`;
            return (
              <g key={node.label}>
                {/* Line */}
                <path
                  id={pathId}
                  d={`M ${cx} ${cy} L ${tx} ${ty}`}
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 3"
                />
                {/* Animated dot */}
                <circle
                  r="3"
                  fill="hsl(var(--primary))"
                  style={{
                    offsetPath: `path('M ${cx} ${cy} L ${tx} ${ty}')`,
                    animation: `travel 2.5s ease-in-out ${i * 0.4}s infinite`,
                  }}
                />
                {/* Destination node */}
                <circle cx={tx} cy={ty} r="28" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1.5" />
                <text x={tx} y={ty - 6} textAnchor="middle" className="text-[9px] fill-foreground font-medium">
                  {node.label}
                </text>
                <text x={tx} y={ty + 10} textAnchor="middle" className="text-[11px] fill-primary font-bold">
                  {node.pct}%
                </text>
              </g>
            );
          })}
          {/* Center node */}
          <circle cx={cx} cy={cy} r="36" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x={cx} y={cy - 6} textAnchor="middle" className="text-[10px] fill-foreground font-semibold">
            Quest Budget
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="text-[12px]">
            🟩
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── Reusable section wrapper ────────────────────────────────
function Section({ number, title, icon, children }: { number: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <h2 className="font-display text-lg font-semibold">
          <span className="text-primary mr-1.5">{number}.</span>
          {title}
        </h2>
      </div>
      <div className="ml-11">{children}</div>
    </section>
  );
}

// ── Value card ──────────────────────────────────────────────
function ValueCard({ title, desc, icon, color }: { title: string; desc: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
