import { useState, useMemo } from "react";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { sortPosts } from "@/lib/feedSort";

interface FeedSectionProps {
  contextType: string;
  contextId?: string;
  canPost?: boolean;
  className?: string;
}

export function FeedSection({ contextType, contextId, canPost = true, className }: FeedSectionProps) {
  const { session } = useAuth();
  const { data: posts = [], isLoading } = useFeedPosts(contextType, contextId);
  const [sortMode, setSortMode] = useState<FeedSortMode>("recent");
  const isLoggedIn = !!session;

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);

  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  return (
    <div className={className}>
      {isLoggedIn && canPost && (
        <PostComposer contextType={contextType} contextId={contextId} />
      )}

      {posts.length > 0 && (
        <div className="mt-4 flex justify-end">
          <FeedSortControl value={sortMode} onChange={setSortMode} />
        </div>
      )}

      <div className="mt-3 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            No posts yet. Be the first to share something!
          </p>
        ) : (
          sortedPosts.map((post) => (
            <PostCard key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} />
          ))
        )}
      </div>
    </div>
  );
}
