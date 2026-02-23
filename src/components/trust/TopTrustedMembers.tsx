import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  /** member user IDs to evaluate */
  memberIds: string[];
  /** optional: only count edges with these tags */
  relevantTags?: string[];
  maxDisplay?: number;
}

interface MemberTrust {
  userId: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  topTags: string[];
}

export function TopTrustedMembers({ memberIds, relevantTags, maxDisplay = 5 }: Props) {
  const { data: members } = useQuery({
    queryKey: ["top-trusted-members", memberIds.sort().join(","), relevantTags?.join(",")],
    enabled: memberIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<MemberTrust[]> => {
      if (memberIds.length === 0) return [];

      // Fetch public active trust edges targeting these profiles
      const { data: edges } = await supabase
        .from("trust_edges")
        .select("to_node_id, score, tags")
        .eq("to_node_type", "profile")
        .eq("status", "active")
        .eq("visibility", "public")
        .in("to_node_id", memberIds);

      // Aggregate per member
      const agg: Record<string, { score: number; tagCounts: Record<string, number> }> = {};
      for (const e of (edges ?? []) as any[]) {
        if (!agg[e.to_node_id]) agg[e.to_node_id] = { score: 0, tagCounts: {} };
        const entry = agg[e.to_node_id];
        const base = 1 + e.score * 0.2;

        // If relevantTags filter provided, only count matching edges
        if (relevantTags && relevantTags.length > 0) {
          const edgeTags: string[] = e.tags ?? [];
          if (!edgeTags.some((t: string) => relevantTags.includes(t))) continue;
        }

        entry.score += base;
        for (const tag of e.tags ?? []) {
          if (typeof tag === "string" && !tag.startsWith("__")) {
            entry.tagCounts[tag] = (entry.tagCounts[tag] ?? 0) + 1;
          }
        }
      }

      // Sort by score desc
      const sorted = Object.entries(agg)
        .filter(([, v]) => v.score > 0)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, maxDisplay);

      if (sorted.length === 0) return [];

      // Fetch profiles
      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      for (const p of (profiles ?? []) as any[]) {
        profileMap[p.user_id] = p;
      }

      return sorted.map(([id, { score, tagCounts }]) => ({
        userId: id,
        name: profileMap[id]?.name ?? "Unknown",
        avatarUrl: profileMap[id]?.avatar_url ?? null,
        score: Math.round(score * 10) / 10,
        topTags: Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t),
      }));
    },
  });

  if (!members || members.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
        <Shield className="h-4 w-4 text-amber-500" />
        Most Trusted Members
      </h4>
      <div className="space-y-1.5">
        {members.map((m) => (
          <Link
            key={m.userId}
            to={`/users/${m.userId}`}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={m.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[10px]">{m.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{m.name}</p>
              <div className="flex items-center gap-1">
                {m.topTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-3.5">{tag}</Badge>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <Shield className="h-3 w-3" />
              {m.score}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
