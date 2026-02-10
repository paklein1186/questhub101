import { useState } from "react";
import { Flag, CheckCircle, XCircle, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AdminExcerptReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-excerpt-reports", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("starred_excerpt_reports")
        .select("*, starred_excerpts!inner(id, excerpt_text, title, is_from_agent, created_by_user_id, is_deleted)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data } = await query;
      if (!data?.length) return [];

      // Fetch reporter profiles
      const userIds = [...new Set(data.map(d => d.reported_by_user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      for (const p of profiles ?? []) profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };

      return data.map((d: any) => ({ ...d, reporterProfile: profileMap[d.reported_by_user_id] || null }));
    },
    enabled: !!user?.id,
  });

  const handleAction = async (reportId: string, excerptId: string, action: "REVIEWED" | "DISMISSED" | "DELETE") => {
    try {
      if (action === "DELETE") {
        await supabase.from("starred_excerpts").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", excerptId);
        await supabase.from("starred_excerpt_reports").update({ status: "REVIEWED", reviewed_at: new Date().toISOString(), reviewed_by_user_id: user!.id }).eq("excerpt_id", excerptId);
      } else {
        await supabase.from("starred_excerpt_reports").update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by_user_id: user!.id }).eq("id", reportId);
      }
      qc.invalidateQueries({ queryKey: ["admin-excerpt-reports"] });
      toast({ title: action === "DELETE" ? "Excerpt deleted" : `Report ${action.toLowerCase()}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Flag className="h-6 w-6 text-primary" /> Excerpt Reports
      </h2>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{reports.length} report(s)</span>
      </div>

      {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}

      {!isLoading && reports.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">No reports found.</p>
      )}

      <div className="space-y-2">
        {reports.map((report: any) => (
          <ReportCard key={report.id} report={report} onAction={(action) => handleAction(report.id, report.excerpt_id, action)} />
        ))}
      </div>
    </div>
  );
}

function ReportCard({ report, onAction }: { report: any; onAction: (action: "REVIEWED" | "DISMISSED" | "DELETE") => void }) {
  const [expanded, setExpanded] = useState(false);
  const excerpt = report.starred_excerpts;
  const excerptTitle = excerpt?.title || (excerpt?.excerpt_text?.slice(0, 60) + "…");

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${report.status === "PENDING" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-left flex-1 min-w-0">
          {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <span className="text-sm font-medium truncate">{excerptTitle}</span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={report.status === "PENDING" ? "destructive" : "secondary"} className="text-[9px]">{report.status}</Badge>
          <Badge variant="outline" className="text-[9px]">{report.reason}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-5">
        <span className="text-[10px] text-muted-foreground">Reported by</span>
        <Avatar className="h-4 w-4">
          <AvatarImage src={report.reporterProfile?.avatar_url || undefined} />
          <AvatarFallback className="text-[8px]">{report.reporterProfile?.name?.charAt(0) || "?"}</AvatarFallback>
        </Avatar>
        <span className="text-[10px] text-muted-foreground">
          {report.reporterProfile?.name || "User"} · {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
        </span>
      </div>

      {report.custom_reason && <p className="text-xs text-muted-foreground pl-5">"{report.custom_reason}"</p>}

      {expanded && excerpt && (
        <div className="pl-5 pt-1 prose prose-sm max-w-none dark:prose-invert text-sm bg-muted/30 rounded-lg p-2">
          {excerpt.excerpt_text?.slice(0, 300)}
          {excerpt.is_deleted && <Badge variant="destructive" className="text-[9px] ml-2">Deleted</Badge>}
        </div>
      )}

      {report.status === "PENDING" && (
        <div className="flex items-center gap-2 pl-5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction("REVIEWED")}>
            <CheckCircle className="h-3 w-3 mr-1" /> Mark reviewed
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onAction("DISMISSED")}>
            <XCircle className="h-3 w-3 mr-1" /> Dismiss
          </Button>
          {!excerpt?.is_deleted && (
            <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => onAction("DELETE")}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete excerpt
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
