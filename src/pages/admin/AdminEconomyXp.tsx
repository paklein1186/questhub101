import { Star, Loader2, TrendingUp, Users, BarChart3, Settings2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { XP_LEVEL_THRESHOLDS, LEVEL_LABELS, computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { GOVERNANCE_RIGHTS } from "@/lib/governanceConfig";

export default function AdminEconomyXp() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["admin-xp-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("xp_transactions")
        .select("id, user_id, amount_xp, type, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!data?.length) return [];
      const ids = [...new Set(data.map(t => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach(p => { nameMap[p.user_id] = p.name; });
      return data.map(t => ({ ...t, userName: nameMap[t.user_id] ?? "—" }));
    },
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ["admin-achievements"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("id, title, user_id, created_at").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  // XP distribution stats
  const { data: distributionStats } = useQuery({
    queryKey: ["admin-xp-distribution"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("xp, xp_level")
        .not("xp", "is", null);
      if (!profiles?.length) return null;
      const totalUsers = profiles.length;
      const levelCounts: Record<number, number> = {};
      let totalXp = 0;
      let maxXp = 0;
      for (const p of profiles) {
        const xp = p.xp ?? 0;
        const level = computeLevelFromXp(xp);
        levelCounts[level] = (levelCounts[level] || 0) + 1;
        totalXp += xp;
        if (xp > maxXp) maxXp = xp;
      }
      return { totalUsers, levelCounts, totalXp, avgXp: Math.round(totalXp / totalUsers), maxXp };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Star className="h-6 w-6 text-primary" /> XP & Regenerative Collaboration Ladder
      </h2>

      <Tabs defaultValue="distribution">
        <TabsList>
          <TabsTrigger value="distribution" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Distribution</TabsTrigger>
          <TabsTrigger value="transactions" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Transactions</TabsTrigger>
          <TabsTrigger value="levels" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Level Config</TabsTrigger>
          <TabsTrigger value="governance" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Governance</TabsTrigger>
        </TabsList>

        {/* ─── Distribution ─── */}
        <TabsContent value="distribution" className="space-y-4 mt-4">
          {distributionStats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="pt-4">
                  <p className="text-2xl font-bold">{distributionStats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-2xl font-bold">{distributionStats.totalXp.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total XP Distributed</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-2xl font-bold">{distributionStats.avgXp}</p>
                  <p className="text-xs text-muted-foreground">Average XP</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-2xl font-bold">{distributionStats.maxXp.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Highest XP</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">Level Distribution</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {XP_LEVEL_THRESHOLDS.map(({ level, minXp }) => {
                    const count = distributionStats.levelCounts[level] || 0;
                    const pct = distributionStats.totalUsers > 0 ? (count / distributionStats.totalUsers) * 100 : 0;
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <span className="text-xs w-32 shrink-0 font-medium">
                          Lv{level} {LEVEL_LABELS[level]}
                        </span>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {count} ({Math.round(pct)}%)
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ─── Transactions ─── */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <h3 className="font-semibold text-lg mb-2">Recent XP Transactions</h3>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead className="text-right">XP</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.userName}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{t.type}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${t.amount_xp > 0 ? "text-green-600" : "text-red-500"}`}>{t.amount_xp > 0 ? "+" : ""}{t.amount_xp}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No XP transactions yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}

          <h3 className="font-semibold text-lg mb-2">Recent Achievements</h3>
          {achievements.length === 0 ? <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p> : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                <TableBody>
                  {achievements.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Level Config Reference ─── */}
        <TabsContent value="levels" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Regenerative Collaboration Ladder – Thresholds</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Min XP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {XP_LEVEL_THRESHOLDS.map(({ level, minXp }) => (
                      <TableRow key={level}>
                        <TableCell className="font-medium">Lv{level}</TableCell>
                        <TableCell>{LEVEL_LABELS[level]}</TableCell>
                        <TableCell className="text-right font-mono">{minXp.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Thresholds are defined in <code className="text-[10px] bg-muted px-1 py-0.5 rounded">src/lib/xpCreditsConfig.ts</code> and the database function <code className="text-[10px] bg-muted px-1 py-0.5 rounded">grant_user_xp</code>. Both must be updated together.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Governance Rights Reference ─── */}
        <TabsContent value="governance" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Governance Rights by Level</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border overflow-hidden max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Level</TableHead>
                      <TableHead>Right</TableHead>
                      <TableHead>Sphere</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {GOVERNANCE_RIGHTS.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">Lv{r.minLevel}</TableCell>
                        <TableCell>
                          <span className="text-sm">{r.label}</span>
                          <p className="text-[10px] text-muted-foreground">{r.description}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">{r.sphere}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Governance rights are defined in <code className="text-[10px] bg-muted px-1 py-0.5 rounded">src/lib/governanceConfig.ts</code>. SuperAdmin can customize these per deployment.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
