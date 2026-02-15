import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare, Lock, Globe, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sortPosts } from "@/lib/feedSort";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";

interface GuildDiscussionTabProps {
  guildId: string;
  guildName: string;
  isAdmin: boolean;
  isMember: boolean;
  canPost: boolean; // derived from features_config discussionPostPermission
}

const VISIBILITY_LABELS: Record<string, { label: string; icon: typeof Globe }> = {
  public: { label: "Public", icon: Globe },
  members: { label: "Members only", icon: Lock },
  admins: { label: "Admins only", icon: Shield },
};

export function GuildDiscussionTab({ guildId, guildName, isAdmin, isMember, canPost }: GuildDiscussionTabProps) {
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const [sortMode, setSortMode] = useState<FeedSortMode>("recent");

  const { data: posts = [], isLoading } = useQuery<FeedPostWithAttachments[]>({
    queryKey: ["guild-discussion", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
        .eq("context_type", "GUILD_DISCUSSION")
        .eq("context_id", guildId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const result = (data ?? []) as unknown as FeedPostWithAttachments[];

      // Fetch author profiles
      const authorIds = [...new Set(result.map((p) => p.author_user_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        for (const post of result) {
          post.author = profileMap.get(post.author_user_id) as any;
        }
      }

      return result;
    },
  });

  // Filter posts by visibility based on user role
  const visiblePosts = useMemo(() => {
    return posts.filter((post: any) => {
      const vis = post.visibility || "public";
      if (vis === "public") return true;
      if (vis === "members") return isMember;
      if (vis === "admins") return isAdmin;
      return true;
    });
  }, [posts, isMember, isAdmin]);

  const postIds = useMemo(() => visiblePosts.map((p) => p.id), [visiblePosts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);
  const sortedPosts = useMemo(() => sortPosts(visiblePosts, sortMode), [visiblePosts, sortMode]);

  return (
    <div className="space-y-4">
      {isLoggedIn && canPost && (
        <PostComposer
          contextType="GUILD_DISCUSSION"
          contextId={guildId}
          showVisibilityPicker
        />
      )}

      {visiblePosts.length > 0 && (
        <div className="flex items-center justify-end">
          <FeedSortControl value={sortMode} onChange={setSortMode} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No discussions in {guildName} yet</p>
          {canPost && <p className="text-xs mt-1">Start a conversation!</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => {
            const vis = (post as any).visibility || "public";
            const visInfo = VISIBILITY_LABELS[vis];
            return (
              <div key={post.id} className="relative">
                {vis !== "public" && (
                  <Badge variant="outline" className="absolute top-2 right-2 z-10 text-[10px] gap-1 bg-background/80 backdrop-blur-sm">
                    {visInfo && <visInfo.icon className="h-3 w-3" />}
                    {visInfo?.label}
                  </Badge>
                )}
                <PostCard post={post} hasUpvoted={upvotedSet.has(post.id)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
