import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface FeedSectionProps {
  contextType: string;
  contextId?: string;
  /** Whether the current user can post (e.g. is a member) */
  canPost?: boolean;
  className?: string;
}

export function FeedSection({ contextType, contextId, canPost = true, className }: FeedSectionProps) {
  const { session } = useAuth();
  const { data: posts = [], isLoading } = useFeedPosts(contextType, contextId);
  const isLoggedIn = !!session;

  return (
    <div className={className}>
      {isLoggedIn && canPost && (
        <PostComposer contextType={contextType} contextId={contextId} />
      )}

      <div className="mt-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            No posts yet. Be the first to share something!
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
