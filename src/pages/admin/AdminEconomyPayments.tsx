import { Zap, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminEconomyPayments() {
  const { data: shareholdings = [], isLoading } = useQuery({
    queryKey: ["admin-shareholdings"],
    queryFn: async () => {
      const { data } = await supabase.from("shareholdings").select("id, user_id, share_class, number_of_shares, total_paid, created_at").order("created_at", { ascending: false });
      if (!data?.length) return [];
      const ids = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
      const nameMap: Record<string, string> = {};
      (profiles ?? []).forEach(p => { nameMap[p.user_id] = p.name; });
      return data.map(s => ({ ...s, userName: nameMap[s.user_id] ?? "—" }));
    },
  });

  const totalA = shareholdings.filter(s => s.share_class === "A").reduce((sum, s) => sum + s.number_of_shares, 0);
  const totalB = shareholdings.filter(s => s.share_class === "B").reduce((sum, s) => sum + s.number_of_shares, 0);
  const totalPaid = shareholdings.reduce((sum, s) => sum + s.total_paid, 0);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" /> Payments & Shares
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Class A Shares</p>
          <p className="text-2xl font-bold text-primary">{totalA}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Class B Shares</p>
          <p className="text-2xl font-bold text-primary">{totalB}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">€{totalPaid}</p>
        </div>
      </div>
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Shares</TableHead><TableHead className="text-right">Total Paid</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>
              {shareholdings.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.userName}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{s.share_class}</Badge></TableCell>
                  <TableCell className="text-right">{s.number_of_shares}</TableCell>
                  <TableCell className="text-right">€{s.total_paid}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {shareholdings.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No share purchases yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
