import type { AdminActionLog } from "@/types/models";

export const adminActionLogs: AdminActionLog[] = [];

let logCounter = 0;

export function logAdminAction(
  adminUserId: string,
  actionType: string,
  targetEntityType: string,
  targetEntityId: string,
  details: string,
) {
  logCounter++;
  const entry: AdminActionLog = {
    id: `aal-${logCounter}`,
    adminUserId,
    actionType,
    targetEntityType,
    targetEntityId,
    details,
    createdAt: new Date().toISOString(),
  };
  adminActionLogs.unshift(entry);
  return entry;
}
