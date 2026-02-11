import { ScrollText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminSystemAudit() {
  const { data: recentActions = [] } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      // Show recent admin-relevant activity from notifications table as a proxy
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" /> Audit Logs
      </h2>
      {recentActions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{a.type?.toLowerCase().replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{a.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
