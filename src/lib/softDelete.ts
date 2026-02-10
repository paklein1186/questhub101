import type { SoftDeletable } from "@/types/models";

/** Filter out soft-deleted items. Pass includeDeleted=true to show all (admin). */
export function filterActive<T extends SoftDeletable>(items: T[], includeDeleted = false): T[] {
  if (includeDeleted) return items;
  return items.filter((item) => !item.isDeleted);
}

/** Soft-delete an item in a mutable array. */
export function softDelete<T extends SoftDeletable & { id: string }>(
  items: T[],
  id: string,
  deletedByUserId?: string,
): T | undefined {
  const item = items.find((i) => i.id === id);
  if (item) {
    item.isDeleted = true;
    item.deletedAt = new Date().toISOString();
    item.deletedByUserId = deletedByUserId;
  }
  return item;
}

/** Restore a soft-deleted item. */
export function restoreItem<T extends SoftDeletable & { id: string }>(
  items: T[],
  id: string,
): T | undefined {
  const item = items.find((i) => i.id === id);
  if (item) {
    item.isDeleted = false;
    item.deletedAt = undefined;
    item.deletedByUserId = undefined;
  }
  return item;
}

/** Permanently remove an item from a mutable array. */
export function permanentDelete<T extends { id: string }>(
  items: T[],
  id: string,
): boolean {
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    return true;
  }
  return false;
}
