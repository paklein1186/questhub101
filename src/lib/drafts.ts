import type { Draftable } from "@/types/models";

/** Filter out draft items from public lists — only show drafts to creatorId or admins. */
export function filterPublished<T extends Draftable>(
  items: T[],
  currentUserId: string,
  getCreatorId: (item: T) => string | undefined,
  isAdmin = false,
): T[] {
  return items.filter((item) => {
    if (!item.isDraft) return true;
    if (isAdmin) return true;
    return getCreatorId(item) === currentUserId;
  });
}
