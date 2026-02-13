import type { ExploreSortMode } from "@/components/ExploreFilters";

/**
 * Generic sort function for explore entity lists.
 * Entities must have `updated_at`, `created_at`, and a member count derived externally.
 */
export function sortEntities<T>(
  items: T[],
  mode: ExploreSortMode,
  getMemberCount: (item: T) => number,
  getUpdatedAt: (item: T) => string,
  getCreatedAt: (item: T) => string,
): T[] {
  const list = [...items];

  switch (mode) {
    case "recent_activity":
      return list.sort(
        (a, b) => new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime()
      );
    case "newest":
      return list.sort(
        (a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime()
      );
    case "most_members":
      return list.sort((a, b) => {
        const diff = getMemberCount(b) - getMemberCount(a);
        if (diff !== 0) return diff;
        return new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime();
      });
    default:
      return list;
  }
}
