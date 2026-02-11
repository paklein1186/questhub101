import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";
import type { FeedSortMode } from "@/components/feed/FeedSortControl";

export function sortPosts(posts: FeedPostWithAttachments[], mode: FeedSortMode): FeedPostWithAttachments[] {
  const list = [...posts];

  switch (mode) {
    case "recent":
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    case "popular":
      return list.sort((a, b) => {
        const ua = (a as any).upvote_count ?? 0;
        const ub = (b as any).upvote_count ?? 0;
        if (ub !== ua) return ub - ua;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    case "relevant": {
      const now = Date.now();
      const DAY_MS = 86_400_000;
      return list.sort((a, b) => {
        const scoreA = Math.log2(1 + ((a as any).upvote_count ?? 0)) + Math.max(0, 7 - (now - new Date(a.created_at).getTime()) / DAY_MS);
        const scoreB = Math.log2(1 + ((b as any).upvote_count ?? 0)) + Math.max(0, 7 - (now - new Date(b.created_at).getTime()) / DAY_MS);
        return scoreB - scoreA;
      });
    }

    default:
      return list;
  }
}
