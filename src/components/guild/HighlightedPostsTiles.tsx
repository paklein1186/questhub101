import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HighlightedPostsTilesProps {
  guildId: string;
  onViewAll: () => void;
}

export function HighlightedPostsTiles({ guildId, onViewAll }: HighlightedPostsTilesProps) {
  // Fetch guild to get highlighted post IDs from features_config
  const { data: guild } = useQuery({
    queryKey: ["guild", guildId],
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("features_config").eq("id", guildId).single();
      return data;
    },
  });

  const highlightedIds: string[] = (guild?.features_config as any)?.highlightedPosts || [];

  const { data: posts = [] } = useQuery({
    queryKey: ["highlighted-posts", guildId, highlightedIds],
    queryFn: async () => {
      if (highlightedIds.length === 0) return [];
      const { data } = await supabase
        .from("feed_posts")
        .select("id, content, author_user_id, created_at")
        .in("id", highlightedIds)
        .eq("is_deleted", false);

      if (!data || data.length === 0) return [];

      const authorIds = [...new Set(data.map((p) => p.author_user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", authorIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return data.map((p) => ({ ...p, author: profileMap.get(p.author_user_id) }));
    },
    enabled: highlightedIds.length > 0,
  });

  if (posts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-semibold flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" /> Highlighted Posts
        </h3>
        <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
          View all <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post: any) => (
          <div
            key={post.id}
            className="rounded-lg border border-primary/20 bg-card p-4 hover:border-primary/40 transition-all cursor-pointer"
            onClick={onViewAll}
          >
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={post.author?.avatar_url} />
                <AvatarFallback className="text-[10px]">{post.author?.name?.[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate">{post.author?.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-3 whitespace-pre-line">{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
