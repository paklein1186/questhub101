import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/**
 * Checks user roles against the `user_roles` table via the `has_role()` DB function.
 * Replaces the old email-allowlist approach.
 */

/** Hook that returns { isAdmin, isSuperAdmin } for the given user ID */
export function useUserRoles(userId: string | undefined) {
  const { data: roles = [] } = useQuery({
    queryKey: ["user-roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      return (data ?? []).map((r) => r.role);
    },
    staleTime: 30_000,
  });

  return {
    isAdmin: roles.includes("admin") || roles.includes("superadmin"),
    isSuperAdmin: roles.includes("superadmin"),
    roles,
  };
}

/** Legacy sync helper — kept for simple guards that already have roles data.
 *  Prefer `useUserRoles` hook in components.  */
export function isAdmin(_email: string): boolean {
  // Deprecated — always returns false now.
  // Use `useUserRoles(userId)` instead.
  return false;
}

/** Call the DB function `set_user_role` which enforces superadmin-only + safety rules */
export async function setUserRole(
  actorId: string,
  targetUserId: string,
  role: "admin" | "superadmin",
  grant: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("set_user_role" as any, {
    _actor_id: actorId,
    _target_user_id: targetUserId,
    _role: role,
    _grant: grant,
  });
  return { error: error?.message ?? null };
}
