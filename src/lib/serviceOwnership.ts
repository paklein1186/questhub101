import { supabase } from "@/integrations/supabase/client";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";

export type ServiceOwnerType = "USER" | "GUILD" | "COMPANY";

export async function canManageService(
  currentUserId: string,
  currentUserEmail: string,
  service: { owner_type?: string; owner_id?: string; provider_user_id?: string | null; provider_guild_id?: string | null }
): Promise<boolean> {
  if (checkIsGlobalAdmin(currentUserEmail)) return true;

  const ownerType = (service.owner_type || "USER") as ServiceOwnerType;
  const ownerId = service.owner_id || service.provider_user_id;

  if (ownerType === "USER") {
    return currentUserId === ownerId;
  }

  if (ownerType === "GUILD") {
    const guildId = ownerId || service.provider_guild_id;
    if (!guildId) return false;
    const { data } = await supabase
      .from("guild_members")
      .select("role")
      .eq("guild_id", guildId)
      .eq("user_id", currentUserId)
      .single();
    return data?.role === "ADMIN";
  }

  if (ownerType === "COMPANY") {
    if (!ownerId) return false;
    const { data } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", ownerId)
      .eq("user_id", currentUserId)
      .single();
    return data?.role === "admin" || data?.role === "owner";
  }

  return false;
}

/** Synchronous check for simple UI cases */
export function canManageServiceSync(
  currentUserId: string,
  currentUserEmail: string,
  service: { owner_type?: string; owner_id?: string; provider_user_id?: string | null },
  /** Pass the user's guild membership role if owner_type is GUILD */
  guildMemberRole?: string | null,
  /** Pass the user's company membership role if owner_type is COMPANY */
  companyMemberRole?: string | null
): boolean {
  if (checkIsGlobalAdmin(currentUserEmail)) return true;

  const ownerType = (service.owner_type || "USER") as ServiceOwnerType;
  const ownerId = service.owner_id || service.provider_user_id;

  if (ownerType === "USER") return currentUserId === ownerId;
  if (ownerType === "GUILD") return guildMemberRole === "ADMIN";
  if (ownerType === "COMPANY") return companyMemberRole === "admin" || companyMemberRole === "owner";

  return false;
}

export function getOwnerLabel(ownerType: string): string {
  switch (ownerType) {
    case "GUILD": return "Guild service";
    case "COMPANY": return "Company service";
    default: return "Individual service";
  }
}
