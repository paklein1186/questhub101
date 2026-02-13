import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/feed/PostCard";
import { PostComposer } from "@/components/feed/PostComposer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, MessageSquare } from "lucide-react";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";

interface TerritoryPostsTabProps {
  territoryId: string;
  territoryName: string;
}

export function TerritoryPostsTab({ territoryId, territoryName }: TerritoryPostsTabProps) {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();

  const { data: posts = [], isLoading } = useQuery<FeedPostWithAttachments[]>({
    queryKey: ["territory-posts", territoryId],
    queryFn: async () => {
      // Get post IDs linked to this territory
      const { data: links, error: linkErr } = await supabase
        .from("post_territories")
        .select("post_id")
        .eq("territory_id", territoryId);
      if (linkErr) throw linkErr;
      const postIds = (links ?? []).map((l: any) => l.post_id);
      if (postIds.length === 0) return [];

      const { data, error } = await supabase
        .from("feed_posts")
        .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
        .in("id", postIds)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const result = (data ?? []) as unknown as FeedPostWithAttachments[];
      const authorIds = [...new Set(result.map((p) => p.author_user_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, email")
          .in("user_id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        for (const post of result) {
          post.author = profileMap.get(post.author_user_id) as any;
        }
      }

      // Fetch upvotes for current user
      if (currentUser.id && result.length > 0) {
        const { data: upvotes } = await supabase
          .from("post_upvotes")
          .select("post_id")
          .eq("user_id", currentUser.id)
          .in("post_id", result.map((p) => p.id));
        const upvotedSet = new Set((upvotes ?? []).map((u: any) => u.post_id));
        for (const post of result) {
          (post as any)._hasUpvoted = upvotedSet.has(post.id);
        }
      }

      return result;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {authUser && <PostComposer contextType="TERRITORY" contextId={territoryId} />}

      {posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No posts about {territoryName} yet</p>
          <p className="text-xs mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} hasUpvoted={(post as any)._hasUpvoted} />
          ))}
        </div>
      )}
    </div>
  );
}
