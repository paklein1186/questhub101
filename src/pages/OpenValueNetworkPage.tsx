import { ContentPageShell } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Zap, Shield, Leaf, BarChart3, Heart,
  Network, Target, FileText, ArrowRight, Globe, Sparkles, Activity
} from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";

interface Props {
  embedded?: boolean;
}

function useOVNStats() {
  return useQuery({
    queryKey: ["ovn-page-stats"],
    staleTime: 60_000,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [tokensRes, questsRes, contribRes, guildsRes] = await Promise.all([
        supabase.from("coin_transactions" as any).select("amount").in("type", ["quest_payout", "QUEST_DISTRIBUTION"]),
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

function useRecentValuePieQuests() {
  return useQuery({
    queryKey: ["ovn-recent-vp-quests"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, created_at, coins_budget")
        .eq("value_pie_calculated", true as any)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data || []) as { id: string; title: string; created_at: string; coins_budget: number }[];
    },
  });
}

export default function OpenValueNetworkPage({ embedded }: Props) {
  const { t } = useTranslation();
  const { data: stats } = useOVNStats();
  const { data: recentQuests } = useRecentValuePieQuests();

  const nodeTypes = [
    { label: t("ovnPage.nodeIndividuals", { defaultValue: "Individuals" }), desc: t("ovnPage.nodeIndividualsDesc", { defaultValue: "talents, experts, citizens" }) },
    { label: t("ovnPage.nodeGuilds", { defaultValue: "Guilds" }), desc: t("ovnPage.nodeGuildsDesc", { defaultValue: "communities of practice" }) },
    { label: t("ovnPage.nodeEntities", { defaultValue: "Entities" }), desc: t("ovnPage.nodeEntitiesDesc", { defaultValue: "projects, associations, businesses" }) },
    { label: t("ovnPage.nodeTerritories", { defaultValue: "Territories" }), desc: t("ovnPage.nodeTerritoriesDesc", { defaultValue: "municipalities, bioregions" }) },
    { label: t("ovnPage.nodeLiving", { defaultValue: "Living Systems" }), desc: t("ovnPage.nodeLivingDesc", { defaultValue: "forests, rivers, soils" }) },
  ];

  const questExpectations = [
    t("ovnPage.qExpect1", { defaultValue: "What is expected" }),
    t("ovnPage.qExpect2", { defaultValue: "How much they'll earn" }),
    t("ovnPage.qExpect3", { defaultValue: "How success is evaluated" }),
    t("ovnPage.qExpect4", { defaultValue: "How disputes are resolved" }),
    t("ovnPage.qExpect5", { defaultValue: "How impact is measured" }),
  ];

  const govSteps = [
    { label: t("ovnPage.gov1", { defaultValue: "Peer Resolution" }), desc: t("ovnPage.gov1Desc", { defaultValue: "Fast, contextual" }) },
    { label: t("ovnPage.gov2", { defaultValue: "Guild Arbitration" }), desc: t("ovnPage.gov2Desc", { defaultValue: "Skills-based" }) },
    { label: t("ovnPage.gov3", { defaultValue: "Territorial Governance" }), desc: t("ovnPage.gov3Desc", { defaultValue: "Strategic" }) },
    { label: t("ovnPage.gov4", { defaultValue: "Council" }), desc: t("ovnPage.gov4Desc", { defaultValue: "Final decision" }) },
  ];

  const whyMatters = [
    t("ovnPage.why1", { defaultValue: "Reveal invisible work" }),
    t("ovnPage.why2", { defaultValue: "Fund what truly matters" }),
    t("ovnPage.why3", { defaultValue: "Create fair economies in communities" }),
    t("ovnPage.why4", { defaultValue: "Support contributors with safety" }),
    t("ovnPage.why5", { defaultValue: "Empower territories with new capacities" }),
    t("ovnPage.why6", { defaultValue: "Connect human decisions with ecological signals" }),
  ];

  return (
    <ContentPageShell
      title={t("ovnPage.title")}
      subtitle={t("ovnPage.subtitle")}
      backTo="/ecosystem"
      backLabel={t("ovnPage.backEcosystem", { defaultValue: "Ecosystem" })}
      embedded={embedded}
    >
      <div className="space-y-12 text-sm leading-relaxed">

        {/* Intro */}
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-base text-foreground">{t("ovnPage.intro")}</p>
          <p className="text-muted-foreground mt-3">{t("ovnPage.introSub")}</p>
        </section>

        {/* Live Stats */}
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t("ovnPage.liveTitle")}
            </h2>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
              {t("ovnPage.liveLabel")}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={t("ovnPage.statCTG")} value={stats?.totalTokens ?? 0} icon="🟩" />
            <StatCard label={t("ovnPage.statQuests")} value={stats?.questCount ?? 0} icon="🥧" />
            <StatCard label={t("ovnPage.statContributors")} value={stats?.distinctUsers ?? 0} icon="👥" />
            <StatCard label={t("ovnPage.statGuilds")} value={stats?.guildCount ?? 0} icon="⚔️" />
          </div>
        </section>

        {/* 1. Nodes */}
        <Section number="1" title={t("ovnPage.s1Title")} icon={<Network className="h-5 w-5" />}>
          <p>{t("ovnPage.s1P")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {nodeTypes.map((n) => (
              <div key={n.label} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-4">{t("ovnPage.s1Carries")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
            {[
              { icon: <CurrencyIcon currency="xp" className="h-4 w-4" />, label: "⭐ XP" },
              { icon: <Shield className="h-4 w-4 text-primary" />, label: "Trust Index" },
              { icon: <CurrencyIcon currency="credits" className="h-4 w-4" />, label: "🔷 Credits" },
              { icon: <CurrencyIcon currency="ctg" className="h-4 w-4" />, label: "🌱 $CTG" },
              { icon: <FileText className="h-4 w-4 text-primary" />, label: "History" },
            ].map((v) => (
              <div key={v.label} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
                {v.icon}
                <p className="text-xs font-medium">{v.label}</p>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs italic">{t("ovnPage.s1Map")}</p>
        </Section>

        {/* 2. Quests */}
        <Section number="2" title={t("ovnPage.s2Title")} icon={<Target className="h-5 w-5" />}>
          <p>{t("ovnPage.s2P")}</p>
          <p className="mt-3">{t("ovnPage.s2Know")}</p>
          <ul className="mt-2 space-y-1 list-none">
            {questExpectations.map((item) => (
              <li key={item} className="flex items-center gap-2 text-muted-foreground">
                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-medium text-foreground">{t("ovnPage.s2Atomic")}</p>
        </Section>

        {/* 3. Triple Value */}
        <Section number="3" title={t("ovnPage.s3Title")} icon={<BarChart3 className="h-5 w-5" />}>
          <p>{t("ovnPage.s3P")}</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-3">
            <ValueCard
              title="A. Reputation (⭐ XP)"
              color="text-primary"
              desc=""
              icon={<Zap className="h-5 w-5" />}
            />
            <ValueCard
              title="B. Trust Index"
              color="text-primary"
              desc=""
              icon={<Shield className="h-5 w-5" />}
            />
            <ValueCard
              title="C. Commons Impact (🌱 $CTG)"
              color="text-primary"
              desc=""
              icon={<Leaf className="h-5 w-5" />}
            />
          </div>
          <p className="mt-3 text-muted-foreground">{t("ovnPage.s3Profile")}</p>
        </Section>

        {/* 4. Value Layers */}
        <Section number="4" title={t("ovnPage.s4Title")} icon={<CurrencyIcon currency="coins" className="h-5 w-5" />}>
          <p className="mt-3 font-medium text-foreground">{t("ovnPage.s4Sep")}</p>
        </Section>

        {/* OCU */}
        <Section number="4b" title={t("ovnPage.s4bTitle")} icon={<CurrencyIcon currency="weight" className="h-5 w-5" />}>
          <p className="text-muted-foreground text-sm mb-3">{t("ovnPage.s4bP")}</p>
          <p className="text-xs text-muted-foreground mt-3 italic">{t("ovnPage.s4bOptIn")}</p>
        </Section>

        {/* 5. Redistribution */}
        <Section number="5" title={t("ovnPage.s5Title")} icon={<BarChart3 className="h-5 w-5" />}>
          <p>{t("ovnPage.s5P")}</p>
          <div className="mt-6">
            <TokenFlowDiagram t={t} />
          </div>
          <p className="mt-4 text-muted-foreground italic">{t("ovnPage.s5Fair")}</p>
        </Section>

        {/* 6. Governance */}
        <Section number="6" title={t("ovnPage.s6Title")} icon={<CurrencyIcon currency="weight" className="h-5 w-5" />}>
          <p>{t("ovnPage.s6P")}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {govSteps.map((g, i) => (
              <div key={g.label} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                <Badge variant="outline" className="text-xs py-1 px-2">
                  {g.label}
                  <span className="text-muted-foreground ml-1">({g.desc})</span>
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted-foreground">{t("ovnPage.s6Prevents")}</p>
        </Section>

        {/* 7. Living Systems */}
        <Section number="7" title={t("ovnPage.s7Title")} icon={<Leaf className="h-5 w-5" />}>
          <p>{t("ovnPage.s7P")}</p>
          <p className="mt-2 text-muted-foreground">{t("ovnPage.s7Alert")}</p>
          <p className="mt-2 font-medium text-foreground">{t("ovnPage.s7Bio")}</p>
        </Section>

        {/* 8. Why It Matters */}
        <Section number="8" title={t("ovnPage.s8Title")} icon={<Globe className="h-5 w-5" />}>
          <div className="grid sm:grid-cols-2 gap-2 mt-2">
            {whyMatters.map((p) => (
              <div key={p} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2.5">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm">{p}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted-foreground">{t("ovnPage.s8Not")}</p>
        </Section>

        {/* Promise */}
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <Heart className="h-8 w-8 text-primary mx-auto" />
          <div className="space-y-1 text-base font-display">
            <p>{t("ovnPage.promiseP1")}</p>
            <p>{t("ovnPage.promiseP2")}</p>
            <p>{t("ovnPage.promiseP3")}</p>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{t("ovnPage.promiseSub")}</p>
        </section>

        {/* Recent */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t("ovnPage.recentTitle")}
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
                    {q.coins_budget > 0 && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                        🟩 {q.coins_budget}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-4 text-center">{t("ovnPage.recentEmpty")}</p>
          )}
        </section>
      </div>
    </ContentPageShell>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center space-y-1">
      <span className="text-lg">{icon}</span>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function TokenFlowDiagram({ t }: { t: (k: string) => string }) {
  const cx = 200, cy = 160, r = 120;
  const FLOW_NODES = [
    { label: t("ovnPage.flowContributors"), pct: 60, angle: -90 },
    { label: t("ovnPage.flowGuild"), pct: 15, angle: -30 },
    { label: t("ovnPage.flowTerritory"), pct: 10, angle: 30 },
    { label: t("ovnPage.flowCTG"), pct: 10, angle: 150 },
    { label: t("ovnPage.flowLiving"), pct: 5, angle: 210 },
  ];

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
            return (
              <g key={node.label}>
                <path
                  d={`M ${cx} ${cy} L ${tx} ${ty}`}
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray="4 3"
                />
                <circle
                  r="3"
                  fill="hsl(var(--primary))"
                  style={{
                    offsetPath: `path('M ${cx} ${cy} L ${tx} ${ty}')`,
                    animation: `travel 2.5s ease-in-out ${i * 0.4}s infinite`,
                  }}
                />
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
          <circle cx={cx} cy={cy} r="36" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary))" strokeWidth="2" />
          <text x={cx} y={cy - 6} textAnchor="middle" className="text-[10px] fill-foreground font-semibold">
            {t("ovnPage.flowCenter")}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="text-[12px]">🟩</text>
        </svg>
      </div>
    </div>
  );
}

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

function ValueCard({ title, desc, icon, color }: { title: string; desc: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
    </div>
  );
}
