import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Star, Search, Coins, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Quest = {
  id: string;
  title: string;
  status: string;
  is_draft?: boolean;
  credit_budget?: number;
  escrow_credits?: number;
  cover_image_url?: string | null;
  source: "created" | "joined" | "proposal" | "funded";
  role?: string;
  quest_id?: string;
  guild?: { id: string; name: string; logo_url: string | null } | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground" },
  OPEN_FOR_PROPOSALS: { label: "Open for proposals", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  ACTIVE: { label: "Active", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  COMPLETED: { label: "Completed", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
};

interface ProfileQuestsTabProps {
  userId: string;
  isOwnProfile: boolean;
  questsCreated: any[];
  questsJoined: any[];
  proposals: any[];
  fundedQuests: any[];
  canSeePrivate: boolean;
}

export function ProfileQuestsTab({
  userId, isOwnProfile, questsCreated, questsJoined, proposals, fundedQuests, canSeePrivate,
}: ProfileQuestsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch highlighted quest IDs
  const { data: highlightedIds = [] } = useQuery({
    queryKey: ["highlighted-quests", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("highlighted_quests" as any)
        .select("quest_id")
        .eq("user_id", userId);
      return (data || []).map((h: any) => h.quest_id as string);
    },
  });

  const highlightSet = new Set(highlightedIds);

  const toggleHighlight = async (questId: string) => {
    if (highlightSet.has(questId)) {
      await supabase.from("highlighted_quests" as any).delete().eq("user_id", userId).eq("quest_id", questId);
    } else {
      await supabase.from("highlighted_quests" as any).insert({ user_id: userId, quest_id: questId } as any);
    }
    queryClient.invalidateQueries({ queryKey: ["highlighted-quests", userId] });
  };

  // Build unified quest list
  const allQuests: Quest[] = [];
  const seen = new Set<string>();

  for (const q of questsCreated) {
    seen.add(q.id);
    allQuests.push({ ...q, source: "created", guild: q.guilds || null });
  }
  for (const qp of questsJoined) {
    const qId = qp.quest?.id;
    if (qId && !seen.has(qId)) {
      seen.add(qId);
      allQuests.push({
        id: qId, title: qp.quest?.title, status: qp.quest?.status || "ACTIVE",
        cover_image_url: qp.quest?.cover_image_url, source: "joined", role: qp.role,
        guild: qp.quest?.guilds || null,
      });
    }
  }

  // Highlighted quests (completed first, then others)
  const highlighted = allQuests
    .filter((q) => highlightSet.has(q.id))
    .sort((a, b) => {
      if (a.status === "COMPLETED" && b.status !== "COMPLETED") return -1;
      if (a.status !== "COMPLETED" && b.status === "COMPLETED") return 1;
      return 0;
    });

  // Filtered all-quests table
  let tableQuests = [...allQuests];
  if (statusFilter !== "all") tableQuests = tableQuests.filter((q) => q.status === statusFilter);
  if (sourceFilter !== "all") tableQuests = tableQuests.filter((q) => q.source === sourceFilter);
  if (search.trim()) {
    const s = search.toLowerCase();
    tableQuests = tableQuests.filter((q) => q.title?.toLowerCase().includes(s));
  }

  // Sort: completed first, then by status
  const statusOrder = ["COMPLETED", "ACTIVE", "OPEN_FOR_PROPOSALS", "DRAFT"];
  tableQuests.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));

  return (
    <div className="space-y-8">
      {/* ─── Highlighted Section ─── */}
      <section>
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
          Highlighted quests ({highlighted.length})
        </h3>
        {highlighted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {isOwnProfile ? "Star quests to feature them on your profile." : "No highlighted quests yet."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {highlighted.map((q) => (
              <QuestCard key={q.id} quest={q} isOwnProfile={isOwnProfile} isHighlighted toggleHighlight={toggleHighlight} />
            ))}
          </div>
        )}
      </section>

      {/* ─── All Quests Table ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">All quests ({allQuests.length})</h3>
          {isOwnProfile && (
            <Button size="sm" asChild>
              <Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> Create quest</Link>
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search quests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <Filter className="h-3 w-3 mr-1 shrink-0" />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="OPEN_FOR_PROPOSALS">Open for proposals</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="joined">Joined</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {tableQuests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No quests match filters.</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                   {isOwnProfile && <th className="py-2 px-3 text-left w-10"></th>}
                   <th className="py-2 px-3 text-left font-medium text-muted-foreground">Quest</th>
                   <th className="py-2 px-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Guild</th>
                   <th className="py-2 px-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Status</th>
                   <th className="py-2 px-3 text-left font-medium text-muted-foreground hidden md:table-cell">Role</th>
                </tr>
              </thead>
              <tbody>
                {tableQuests.map((q) => {
                  const isH = highlightSet.has(q.id);
                  const st = STATUS_LABELS[q.status];
                  return (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      {isOwnProfile && (
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => toggleHighlight(q.id)}
                            className="p-1 rounded hover:bg-accent/50 transition-colors"
                            title={isH ? "Remove highlight" : "Highlight quest"}
                          >
                            <Star className={cn("h-4 w-4", isH ? "text-amber-500 fill-amber-500" : "text-muted-foreground/40")} />
                          </button>
                        </td>
                      )}
                      <td className="py-2.5 px-3">
                        <Link
                          to={`/quests/${q.id}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {q.title}
                        </Link>
                        <div className="sm:hidden mt-1">
                          <Badge variant="outline" className={cn("text-[10px]", st?.color)}>
                            {st?.label || q.status}
                          </Badge>
                        </div>
                      </td>
                       <td className="py-2.5 px-3 hidden sm:table-cell">
                         {q.guild ? (
                           <Link to={`/guilds/${q.guild.id}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                             <Avatar className="h-5 w-5">
                               {q.guild.logo_url ? <AvatarImage src={q.guild.logo_url} alt={q.guild.name} /> : null}
                               <AvatarFallback className="text-[8px]">{q.guild.name?.[0]}</AvatarFallback>
                             </Avatar>
                             <span className="truncate max-w-[120px]">{q.guild.name}</span>
                           </Link>
                         ) : (
                           <span className="text-muted-foreground/40">—</span>
                         )}
                       </td>
                       <td className="py-2.5 px-3 hidden sm:table-cell">
                         <Badge variant="outline" className={cn("text-[10px]", st?.color)}>
                           {st?.label || q.status}
                         </Badge>
                       </td>
                      <td className="py-2.5 px-3 hidden md:table-cell">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {q.source === "created" ? "Creator" : q.role || "Participant"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Proposals (kept as-is) ─── */}
      {(isOwnProfile || proposals.length > 0) && (
        <section>
          <h3 className="font-display font-semibold mb-3">Proposals ({proposals.length})</h3>
          {proposals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No proposals submitted.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {proposals.map((p: any) => (
                <Link key={p.id} to={`/quests/${p.quest_id}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all block">
                  <h4 className="font-display font-semibold truncate">{p.title}</h4>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">→ {p.quests?.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={p.status === "ACCEPTED" ? "default" : p.status === "REJECTED" ? "destructive" : "outline"} className="text-[10px] capitalize">
                      {p.status?.toLowerCase()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{p.requested_credits} Credits · {p.upvotes_count} votes</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── Funded (kept as-is) ─── */}
      {canSeePrivate && fundedQuests.length > 0 && (
        <section>
          <h3 className="font-display font-semibold mb-3">Quests funded ({fundedQuests.length})</h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {fundedQuests.map((f: any) => (
              <Link key={f.id} to={`/quests/${f.quest_id}`} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all block">
                <h4 className="font-display font-semibold truncate">{f.quests?.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">{f.type}</Badge>
                  <span className="text-[10px] text-muted-foreground">{f.amount} {f.type === "CREDITS" ? "Credits" : f.currency}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuestCard({ quest, isOwnProfile, isHighlighted, toggleHighlight }: {
  quest: Quest; isOwnProfile: boolean; isHighlighted: boolean; toggleHighlight: (id: string) => void;
}) {
  const st = STATUS_LABELS[quest.status];
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all relative group">
      {isOwnProfile && (
        <button
          onClick={(e) => { e.preventDefault(); toggleHighlight(quest.id); }}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/50"
          title="Remove highlight"
        >
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
        </button>
      )}
      <Link to={`/quests/${quest.id}`} className="block">
        <UnitCoverImage type="QUEST" imageUrl={quest.cover_image_url} height="h-24" />
        <div className="p-4">
          <h4 className="font-display font-semibold truncate">{quest.title}</h4>
          {quest.guild && (
            <Link to={`/guilds/${quest.guild.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Avatar className="h-4 w-4">
                {quest.guild.logo_url ? <AvatarImage src={quest.guild.logo_url} alt={quest.guild.name} /> : null}
                <AvatarFallback className="text-[8px]">{quest.guild.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="truncate">{quest.guild.name}</span>
            </Link>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px]", st?.color)}>
              {st?.label || quest.status}
            </Badge>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {quest.source === "created" ? "Creator" : quest.role || "Participant"}
            </Badge>
          </div>
        </div>
      </Link>
    </div>
  );
}
