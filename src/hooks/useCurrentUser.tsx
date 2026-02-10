import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types";
import { UserRole } from "@/types/enums";

/**
 * Returns the currently authenticated user mapped to the app's User type.
 * Previously returned a hardcoded mock user — now wired to real auth/profile data.
 */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) {
    return {
      id: "",
      name: "Guest",
      email: "",
      role: UserRole.GAMECHANGER,
      xp: 0,
      contributionIndex: 0,
    };
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: (user.role as UserRole) || UserRole.GAMECHANGER,
    xp: 0,
    contributionIndex: 0,
  };
}

// Keep backward-compatible provider (now a passthrough, no longer needed)
import type { ReactNode } from "react";
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
