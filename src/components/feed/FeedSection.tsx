import { useState, useMemo } from "react";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { PostTile } from "@/components/feed/PostTile";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { FeedDisplayToggle, type FeedDisplayMode } from "@/components/feed/FeedDisplayToggle";
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
  /** Show display mode toggle (list / gallery tiles) */
  showDisplayToggle?: boolean;
  /** Pre-populate territory chips from parent entity */
  initialTerritoryIds?: string[];
  /** Pre-populate topic chips from parent entity */
  initialTopicIds?: string[];
}

const gridClasses: Record<Exclude<FeedDisplayMode, "list">, string> = {
  small: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
  medium: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  large: "grid grid-cols-1 sm:grid-cols-2 gap-5",
};

export function FeedSection({ contextType, contextId, canPost = true, className, showDisplayToggle = false, initialTerritoryIds, initialTopicIds }: FeedSectionProps) {
  const { session } = useAuth();
  const { data: posts = [], isLoading } = useFeedPosts(contextType, contextId);
  const [sortMode, setSortMode] = useState<FeedSortMode>("recent");
  const [displayMode, setDisplayMode] = useState<FeedDisplayMode>("list");
  const isLoggedIn = !!session;

  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);

  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  return (
    <div className={className}>
      {isLoggedIn && canPost && (
        <PostComposer contextType={contextType} contextId={contextId} initialTerritoryIds={initialTerritoryIds} initialTopicIds={initialTopicIds} />
      )}

      {posts.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {showDisplayToggle ? (
            <FeedDisplayToggle value={displayMode} onChange={setDisplayMode} />
          ) : (
            <div />
          )}
          <FeedSortControl value={sortMode} onChange={setSortMode} />
        </div>
      )}

      <div className="mt-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            No posts yet. Be the first to share something!
          </p>
        ) : displayMode === "list" ? (
          <div className="space-y-4">
            {sortedPosts.map((post) => (
              <PostCard key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} />
            ))}
          </div>
        ) : (
          <div className={gridClasses[displayMode]}>
            {sortedPosts.map((post) => (
              <PostTile key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} size={displayMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
