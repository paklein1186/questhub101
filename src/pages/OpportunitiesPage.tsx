import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Lightbulb, Search, Filter, ArrowUpDown, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "upvotes">("recent");

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["portal-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_proposals" as any)
        .select("*, quests(id, title, status, guild_id, guilds(id, name))")
        .in("status", ["OPEN", "PENDING"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      // Fetch proposer profiles
      const userIds = [...new Set((data || []).map((p: any) => p.proposer_id).filter(Boolean))];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        for (const p of profiles || []) profileMap.set(p.user_id, p);
      }

      return (data || []).map((p: any) => ({
        ...p,
        proposer: profileMap.get(p.proposer_id),
        questTitle: p.quests?.title,
        questId: p.quests?.id,
        questStatus: p.quests?.status,
        guildName: p.quests?.guilds?.name,
        guildId: p.quests?.guild_id,
      }));
    },
  });

  const filtered = useMemo(() => {
    let list = proposals;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.questTitle?.toLowerCase().includes(q) ||
        p.guildName?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "upvotes") {
      list = [...list].sort((a: any, b: any) => (b.upvotes_count ?? 0) - (a.upvotes_count ?? 0));
    }
    return list;
  }, [proposals, search, sortBy]);

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-3">
          <Lightbulb className="h-7 w-7 text-primary" />
          Opportunities
        </h1>
        <p className="text-muted-foreground mt-1">
          Open missions across all quests. Submit your proposal and contribute.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most recent</SelectItem>
            <SelectItem value="upvotes">Most upvoted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading opportunities…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No open opportunities found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((proposal: any) => (
            <Link
              key={proposal.id}
              to={`/quests/${proposal.questId}?tab=explore`}
              className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-1">{proposal.title}</h3>
                  {proposal.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{proposal.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {proposal.questTitle && (
                      <Badge variant="secondary" className="text-[10px]">
                        Quest: {proposal.questTitle}
                      </Badge>
                    )}
                    {proposal.guildName && (
                      <Badge variant="outline" className="text-[10px]">
                        {proposal.guildName}
                      </Badge>
                    )}
                    {Number(proposal.requested_credits ?? 0) > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <CurrencyIcon currency="coins" className="h-3 w-3" />
                        {proposal.requested_credits}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {proposal.proposer && (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={proposal.proposer.avatar_url} />
                        <AvatarFallback className="text-[10px]">{proposal.proposer.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">{proposal.proposer.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {proposal.upvotes_count ?? 0}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
