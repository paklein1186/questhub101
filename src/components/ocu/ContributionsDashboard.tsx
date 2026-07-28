import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FileSignature, Sprout, PieChart as PieIcon, ListChecks, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface RecentContribution {
  id: string;
  title: string;
  created_at: string;
  status: string;
  contribution_type: string;
  weighted_units: number;
  quest_id: string | null;
  quest_title: string | null;
  guild_id: string | null;
  guild_name: string | null;
}

interface ContractRow {
  id: string;
  title: string;
  status: string;
  quest_id: string | null;
  quest_title: string | null;
  signed_at: string | null;
}

interface EntityShare {
  guild_id: string;
  guild_name: string;
  my_units: number;
  total_units: number;
  percent: number;
}

async function loadDashboard(userId: string) {
  // ── Contributions ──
  const { data: logs } = await supabase
    .from("contribution_logs" as any)
    .select("id, title, created_at, status, contribution_type, weighted_units, quest_id, guild_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (logs ?? []) as any[];

  // ── Guild memberships ──
  const { data: memberships } = await supabase
    .from("guild_members")
    .select("guild_id")
    .eq("user_id", userId);

  const guildIds = [
    ...new Set([
      ...rows.map((r) => r.guild_id).filter(Boolean),
      ...(memberships ?? []).map((m) => m.guild_id),
    ]),
  ] as string[];

  const { data: guilds } = guildIds.length
    ? await supabase.from("guilds").select("id, name, logo_url").in("id", guildIds)
    : { data: [] as any[] };
  const guildMap = new Map((guilds ?? []).map((g: any) => [g.id, g]));

  // ── Quests referenced ──
  const questIds = [...new Set(rows.map((r) => r.quest_id).filter(Boolean))] as string[];

  // ── Contracts the user signs / is invited to ──
  const { data: sigs } = await supabase
    .from("contract_signatories")
    .select("contract_id, signed_at")
    .eq("user_id", userId);

  const contractIds = [...new Set((sigs ?? []).map((s) => s.contract_id))];
  const { data: contracts } = contractIds.length
    ? await supabase
        .from("quest_contracts")
        .select("id, title, status, quest_id")
        .in("id", contractIds)
    : { data: [] as any[] };

  const allQuestIds = [
    ...new Set([...questIds, ...((contracts ?? []).map((c: any) => c.quest_id).filter(Boolean) as string[])]),
  ];
  const { data: quests } = allQuestIds.length
    ? await supabase.from("quests").select("id, title").in("id", allQuestIds)
    : { data: [] as any[] };
  const questMap = new Map((quests ?? []).map((q: any) => [q.id, q.title]));

  const signedMap = new Map((sigs ?? []).map((s) => [s.contract_id, s.signed_at]));

  const contractRows: ContractRow[] = (contracts ?? []).map((c: any) => ({
    id: c.id,
    title: c.title ?? "Contract",
    status: c.status ?? "draft",
    quest_id: c.quest_id,
    quest_title: c.quest_id ? questMap.get(c.quest_id) ?? null : null,
    signed_at: signedMap.get(c.id) ?? null,
  }));

  // ── $CTG wallets ──
  const { data: ctgWallet } = await supabase
    .from("ctg_wallets")
    .select("balance, lifetime_earned, lifetime_spent")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: guildWallets } = guildIds.length
    ? await supabase.from("guild_wallets").select("guild_id, coins_balance").in("guild_id", guildIds)
    : { data: [] as any[] };

  // ── Value pie share per entity (weighted units) ──
  const { data: allGuildLogs } = guildIds.length
    ? await supabase
        .from("contribution_logs" as any)
        .select("guild_id, weighted_units, user_id")
        .in("guild_id", guildIds)
        .eq("status", "verified")
    : { data: [] as any[] };

  const shareMap = new Map<string, { mine: number; total: number }>();
  for (const l of (allGuildLogs ?? []) as any[]) {
    if (!l.guild_id) continue;
    const prev = shareMap.get(l.guild_id) ?? { mine: 0, total: 0 };
    const wu = Number(l.weighted_units) || 0;
    prev.total += wu;
    if (l.user_id === userId) prev.mine += wu;
    shareMap.set(l.guild_id, prev);
  }

  const shares: EntityShare[] = Array.from(shareMap.entries())
    .filter(([, v]) => v.total > 0)
    .map(([gid, v]) => ({
      guild_id: gid,
      guild_name: guildMap.get(gid)?.name ?? "Entity",
      my_units: v.mine,
      total_units: v.total,
      percent: (v.mine / v.total) * 100,
    }))
    .sort((a, b) => b.percent - a.percent);

  const recent: RecentContribution[] = rows.slice(0, 15).map((r) => ({
    id: r.id,
    title: r.title,
    created_at: r.created_at,
    status: r.status,
    contribution_type: r.contribution_type,
    weighted_units: Number(r.weighted_units) || 0,
    quest_id: r.quest_id,
    quest_title: r.quest_id ? questMap.get(r.quest_id) ?? null : null,
    guild_id: r.guild_id,
    guild_name: r.guild_id ? guildMap.get(r.guild_id)?.name ?? null : null,
  }));

  return {
    recent,
    contracts: contractRows,
    ctg: {
      balance: Number(ctgWallet?.balance ?? 0),
      lifetime_earned: Number(ctgWallet?.lifetime_earned ?? 0),
      lifetime_spent: Number(ctgWallet?.lifetime_spent ?? 0),
    },
    guildWallets: (guildWallets ?? []).map((w: any) => ({
      guild_id: w.guild_id,
      name: guildMap.get(w.guild_id)?.name ?? "Entity",
      coins: Number(w.coins_balance) || 0,
    })),
    shares,
  };
}

export function ContributionsDashboard() {
  const currentUser = useCurrentUser();
  const userId = currentUser?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["contributions-dashboard", userId],
    enabled: !!userId,
    queryFn: () => loadDashboard(userId!),
    staleTime: 30_000,
  });

  if (!userId) return null;
  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground p-4">Loading contributions dashboard…</p>;
  }

  return (
    <div className="space-y-5">
      {/* ── $CTG wallets ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <WalletCard label="🌱 $CTG Balance" value={data.ctg.balance} accent />
        <WalletCard label="Lifetime earned" value={data.ctg.lifetime_earned} />
        <WalletCard label="Lifetime spent" value={data.ctg.lifetime_spent} />
        <WalletCard label="Entity wallets 🟩" value={data.guildWallets.reduce((s, w) => s + w.coins, 0)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Recent contributions ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-primary" /> Recent task contributions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="text-xs text-muted-foreground">No contribution logged yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recent.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {c.quest_id && (
                          <Link to={`/quests/${c.quest_id}`} className="text-[10px] text-primary hover:underline truncate">
                            {c.quest_title ?? "Quest"}
                          </Link>
                        )}
                        {c.guild_id && (
                          <Link
                            to={`/guilds/${c.guild_id}`}
                            className="text-[10px] text-muted-foreground hover:text-primary inline-flex items-center gap-0.5"
                          >
                            <Building2 className="h-2.5 w-2.5" /> {c.guild_name}
                          </Link>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                      {c.weighted_units > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.weighted_units.toFixed(1)} Wu</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Contracts & conventions ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <FileSignature className="h-4 w-4 text-primary" /> OCU contracts & conventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.contracts.length === 0 ? (
              <p className="text-xs text-muted-foreground">You are not a signatory of any contract yet.</p>
            ) : (
              <div className="space-y-2">
                {data.contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.title}</p>
                      {c.quest_id && (
                        <Link to={`/quests/${c.quest_id}?tab=contract`} className="text-[10px] text-primary hover:underline">
                          {c.quest_title ?? "Quest"}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">{c.status}</Badge>
                      <Badge
                        className={`text-[10px] border ${
                          c.signed_at
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {c.signed_at ? "Signed" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Value pie shares ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <PieIcon className="h-4 w-4 text-primary" /> My share in entity value pies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.shares.length === 0 ? (
            <p className="text-xs text-muted-foreground">No verified contribution units recorded in your entities yet.</p>
          ) : (
            <div className="space-y-3">
              {data.shares.map((s) => (
                <div key={s.guild_id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <Link to={`/guilds/${s.guild_id}`} className="font-medium hover:text-primary truncate">
                      {s.guild_name}
                    </Link>
                    <span className="text-muted-foreground tabular-nums">
                      {s.my_units.toFixed(1)} / {s.total_units.toFixed(1)} Wu · {s.percent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={Math.min(100, s.percent)} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Entity wallets detail ── */}
      {data.guildWallets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Sprout className="h-4 w-4 text-emerald-600" /> Entity wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.guildWallets.map((w) => (
                <Link
                  key={w.guild_id}
                  to={`/guilds/${w.guild_id}`}
                  className="rounded-lg border border-border bg-muted/30 p-3 hover:border-primary/40 transition-colors"
                >
                  <p className="text-[11px] text-muted-foreground truncate">{w.name}</p>
                  <p className="text-base font-bold">🟩 {w.coins.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WalletCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className={accent ? "border-emerald-500/30" : undefined}>
      <CardContent className="p-4">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${accent ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
          {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
      </CardContent>
    </Card>
  );
}
