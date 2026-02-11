import { Star, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

  const { data: achievements = [], isLoading: loadingAch } = useQuery({
    queryKey: ["admin-achievements"],
    queryFn: async () => {
      const { data } = await supabase.from("achievements").select("id, title, user_id, created_at").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Star className="h-6 w-6 text-primary" /> XP & Achievements
      </h2>
      <div>
        <h3 className="font-semibold text-lg mb-2">Recent XP Transactions</h3>
        {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead className="text-right">XP</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.userName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{t.type}</Badge></TableCell>
                    <TableCell className={`text-right font-medium ${t.amount_xp > 0 ? "text-green-600" : "text-red-500"}`}>{t.amount_xp > 0 ? "+" : ""}{t.amount_xp}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.type ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No XP transactions yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <div>
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
      </div>
    </div>
  );
}
