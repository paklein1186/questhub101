import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star, BookOpen, ChevronDown, ChevronRight, ExternalLink,
  ThumbsUp, Flag, MoreHorizontal, Trash2, ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

const ENTITY_LABELS: Record<string, string> = { GUILD: "Guild", QUEST: "Quest", POD: "Pod", COMPANY: "Company", TERRITORY: "Territory", COURSE: "Course", EVENT: "Event" };
const ENTITY_ROUTES: Record<string, string> = { GUILD: "/guilds", QUEST: "/quests", POD: "/pods", COMPANY: "/companies", COURSE: "/courses" };
const REPORT_REASONS = [
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SPAM", label: "Spam" },
  { value: "IRRELEVANT", label: "Irrelevant" },
  { value: "OTHER", label: "Other" },
];

export default function MyStarredExcerpts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [filterSource, setFilterSource] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [searchTag, setSearchTag] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Report dialog
  const [reportDialog, setReportDialog] = useState<{ open: boolean; excerptId: string } | null>(null);
  const [reportReason, setReportReason] = useState("INAPPROPRIATE");
  const [reportCustom, setReportCustom] = useState("");

  const { data: excerpts = [], isLoading } = useQuery({
    queryKey: ["my-starred-excerpts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("starred_excerpts")
        .select("*, unit_chat_threads!inner(entity_type, entity_id)")
        .eq("created_by_user_id", user.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];

      const excerptIds = data.map(d => d.id);

      // Get user upvotes
      const { data: upvotes } = await supabase.from("starred_excerpt_upvotes").select("excerpt_id").eq("user_id", user.id).in("excerpt_id", excerptIds);
      const upvotedSet = new Set((upvotes ?? []).map(u => u.excerpt_id));

      const entityKeys = [...new Set(data.map((d: any) => `${d.unit_chat_threads.entity_type}:${d.unit_chat_threads.entity_id}`))];
      const nameMap: Record<string, string> = {};
      for (const key of entityKeys) {
        const [type, id] = key.split(":");
        try {
          if (type === "GUILD") { const { data: g } = await supabase.from("guilds").select("name").eq("id", id).single(); if (g) nameMap[key] = g.name; }
          else if (type === "QUEST") { const { data: q } = await supabase.from("quests").select("title").eq("id", id).single(); if (q) nameMap[key] = q.title; }
          else if (type === "POD") { const { data: p } = await supabase.from("pods").select("name").eq("id", id).single(); if (p) nameMap[key] = p.name; }
          else if (type === "COMPANY") { const { data: c } = await supabase.from("companies").select("name").eq("id", id).single(); if (c) nameMap[key] = c.name; }
          else if (type === "COURSE") { const { data: c } = await supabase.from("courses").select("title").eq("id", id).single(); if (c) nameMap[key] = c.title; }
        } catch { /* skip */ }
      }

      return data.map((d: any) => ({
        ...d,
        tags: Array.isArray(d.tags) ? d.tags : [],
        entityType: d.unit_chat_threads.entity_type,
        entityId: d.unit_chat_threads.entity_id,
        entityName: nameMap[`${d.unit_chat_threads.entity_type}:${d.unit_chat_threads.entity_id}`] || "Unknown",
        userUpvoted: upvotedSet.has(d.id),
      }));
    },
    enabled: !!user?.id,
  });

  // Filter
  let filtered = excerpts.filter((ex: any) => {
    if (filterSource === "agent" && !ex.is_from_agent) return false;
    if (filterSource === "human" && ex.is_from_agent) return false;
    if (filterEntity !== "all" && ex.entityType !== filterEntity) return false;
    if (searchTag.trim()) {
      const tags = (ex.tags as string[]).map(t => t.toLowerCase());
      if (!tags.some(t => t.includes(searchTag.toLowerCase()))) return false;
    }
    return true;
  });

  // Sort
  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortBy === "upvoted") return (b.upvotes_count || 0) - (a.upvotes_count || 0);
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Group by entity
  const grouped: Record<string, any[]> = {};
  for (const ex of filtered) { const key = `${ex.entityType}:${ex.entityId}`; if (!grouped[key]) grouped[key] = []; grouped[key].push(ex); }

  const handleDelete = async (id: string) => {
    await supabase.from("starred_excerpts").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-starred-excerpts"] });
    toast({ title: "Excerpt removed" });
  };

  const handleToggleUpvote = async (excerptId: string, currentlyUpvoted: boolean) => {
    if (!user?.id) return;
    if (currentlyUpvoted) {
      await supabase.from("starred_excerpt_upvotes").delete().eq("excerpt_id", excerptId).eq("user_id", user.id);
    } else {
      await supabase.from("starred_excerpt_upvotes").insert({ excerpt_id: excerptId, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["my-starred-excerpts"] });
  };

  const handleReport = async () => {
    if (!reportDialog || !user?.id) return;
    try {
      await supabase.from("starred_excerpt_reports").insert({
        excerpt_id: reportDialog.excerptId, reported_by_user_id: user.id,
        reason: reportReason, custom_reason: reportCustom.trim() || null,
      });
      setReportDialog(null);
      toast({ title: "Report submitted. Thank you." });
    } catch (e: any) {
      if (e.message?.includes("duplicate")) toast({ title: "Already reported", variant: "destructive" });
      else toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Star className="h-6 w-6 text-accent" />
          <h1 className="font-display text-2xl font-bold">My Starred Excerpts</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-32 text-xs h-8"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="agent">AI only</SelectItem>
              <SelectItem value="human">Human only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-32 text-xs h-8"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 text-xs h-8"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="upvoted">Most upvoted</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Filter by tag..." value={searchTag} onChange={(e) => setSearchTag(e.target.value)} className="w-36 text-xs h-8" />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
            <BookOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm">You haven't starred any excerpts yet.</p>
            <p className="text-xs">Use the ★ icon in chats to save useful insights.</p>
          </div>
        )}

        {Object.entries(grouped).map(([key, items]) => {
          const first = items[0];
          const entityLabel = ENTITY_LABELS[first.entityType] || first.entityType;
          const route = ENTITY_ROUTES[first.entityType];
          return (
            <div key={key} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">{entityLabel}</Badge>
                <span className="text-sm font-semibold">{first.entityName}</span>
                {route && (
                  <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={() => navigate(`${route}/${first.entityId}`)}>
                    <ExternalLink className="h-3 w-3 mr-1" /> Open
                  </Button>
                )}
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-border">
                {items.map((ex: any) => (
                  <PersonalExcerptItem key={ex.id} excerpt={ex}
                    onDelete={() => handleDelete(ex.id)}
                    onUpvote={() => handleToggleUpvote(ex.id, ex.userUpvoted)}
                    onReport={() => { setReportDialog({ open: true, excerptId: ex.id }); setReportReason("INAPPROPRIATE"); setReportCustom(""); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Dialog */}
      {reportDialog && (
        <Dialog open={reportDialog.open} onOpenChange={(open) => !open && setReportDialog(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Flag className="h-4 w-4 text-destructive" /> Report Excerpt</DialogTitle>
              <DialogDescription>Why are you reporting this excerpt?</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              {reportReason === "OTHER" && <Textarea value={reportCustom} onChange={(e) => setReportCustom(e.target.value)} placeholder="Please describe..." rows={3} className="text-sm" />}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportDialog(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReport}><Flag className="h-3.5 w-3.5 mr-1" /> Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
  );
}

function PersonalExcerptItem({ excerpt, onDelete, onUpvote, onReport }: { excerpt: any; onDelete: () => void; onUpvote: () => void; onReport: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const displayTitle = excerpt.title || excerpt.excerpt_text.slice(0, 60) + (excerpt.excerpt_text.length > 60 ? "…" : "");

  return (
    <div className="rounded-lg border border-border p-3 bg-card space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-left flex-1 min-w-0">
          {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <span className="text-sm font-medium truncate">{displayTitle}</span>
        </button>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onUpvote} className={`flex items-center gap-0.5 text-xs transition-colors ${excerpt.userUpvoted ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"}`}>
            <ThumbsUp className="h-3 w-3" />
            {(excerpt.upvotes_count || 0) > 0 && <span>{excerpt.upvotes_count}</span>}
          </button>
          <Badge variant="outline" className="text-[9px]">{excerpt.is_from_agent ? "Agent" : "Human"}</Badge>
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(excerpt.created_at), { addSuffix: true })}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={onReport} className="text-xs gap-2"><Flag className="h-3 w-3" /> Report</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive gap-2"><Trash2 className="h-3 w-3" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(excerpt.tags as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1 pl-5">
          {(excerpt.tags as string[]).map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>)}
        </div>
      )}

      {expanded && (
        <div className="pl-5 space-y-2">
          <div className="prose prose-sm max-w-none dark:prose-invert text-sm bg-muted/30 rounded-lg p-2"><ReactMarkdown>{excerpt.excerpt_text}</ReactMarkdown></div>
        </div>
      )}
    </div>
  );
}
