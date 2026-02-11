import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, MessageSquare, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = ["NEW", "REVIEWED", "IMPLEMENTED", "DISMISSED"] as const;
const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/10 text-blue-600 border-blue-200",
  REVIEWED: "bg-amber-500/10 text-amber-600 border-amber-200",
  IMPLEMENTED: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  DISMISSED: "bg-muted text-muted-foreground border-border",
};

export default function AdminFeatureSuggestions() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPersona, setFilterPersona] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");
  const [editTags, setEditTags] = useState("");

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["admin-feature-suggestions", filterStatus, filterPersona],
    queryFn: async () => {
      let q = supabase
        .from("feature_suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filterStatus !== "ALL") q = q.eq("status", filterStatus);
      if (filterPersona !== "ALL") q = q.eq("persona_at_time", filterPersona);
      const { data } = await q;
      return data ?? [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, admin_comment, tags }: { id: string; status?: string; admin_comment?: string; tags?: string[] }) => {
      const updates: any = {};
      if (status) updates.status = status;
      if (admin_comment !== undefined) updates.admin_comment = admin_comment;
      if (tags) updates.tags = tags;
      const { error } = await supabase.from("feature_suggestions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-feature-suggestions"] });
      toast.success("Updated");
      setEditingId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-display font-bold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Feature Suggestions & Ideas
        </h1>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPersona} onValueChange={setFilterPersona}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All personas</SelectItem>
              <SelectItem value="IMPACT">Impact</SelectItem>
              <SelectItem value="CREATIVE">Creative</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
              <SelectItem value="UNSET">Unset</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} found
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No suggestions yet.</p>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s: any) => (
            <div key={s.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{s.original_text}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[s.status])}>
                      {s.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{s.persona_at_time}</Badge>
                    <Badge variant="outline" className="text-[10px]">{s.source}</Badge>
                    {s.user_explicit && <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">explicit</Badge>}
                    {s.interpreted_action_type && (
                      <Badge variant="outline" className="text-[10px]">{s.interpreted_action_type}</Badge>
                    )}
                    {s.confidence_score != null && (
                      <Badge variant="outline" className="text-[10px]">conf: {Number(s.confidence_score).toFixed(2)}</Badge>
                    )}
                    {(s.tags ?? []).map((t: string) => (
                      <Badge key={t} className="text-[10px] bg-primary/10 text-primary border-primary/20">{t}</Badge>
                    ))}
                  </div>
                  {s.admin_comment && (
                    <p className="text-xs text-muted-foreground mt-1 italic">💬 {s.admin_comment}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                  {(() => { try { return format(parseISO(s.created_at), "MMM d, h:mm a"); } catch { return ""; } })()}
                </span>
              </div>

              {/* Actions */}
              {editingId === s.id ? (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    placeholder="Admin comment…"
                    className="min-h-[40px] text-xs"
                  />
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="text-xs h-8"
                  />
                  <div className="flex gap-2">
                    {STATUS_OPTIONS.map((st) => (
                      <Button
                        key={st}
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7"
                        onClick={() =>
                          updateMutation.mutate({
                            id: s.id,
                            status: st,
                            admin_comment: editComment || undefined,
                            tags: editTags ? editTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
                          })
                        }
                      >
                        {st}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-6 px-2"
                    onClick={() => {
                      setEditingId(s.id);
                      setEditComment(s.admin_comment || "");
                      setEditTags((s.tags ?? []).join(", "));
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" /> Review
                  </Button>
                  {s.status === "NEW" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2 text-emerald-600"
                        onClick={() => updateMutation.mutate({ id: s.id, status: "REVIEWED" })}
                      >
                        <Check className="h-3 w-3 mr-1" /> Mark reviewed
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2 text-muted-foreground"
                        onClick={() => updateMutation.mutate({ id: s.id, status: "DISMISSED" })}
                      >
                        <X className="h-3 w-3 mr-1" /> Dismiss
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
