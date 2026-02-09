import { createContext, useContext, type ReactNode } from "react";
import type { User } from "@/types";
import { users } from "@/data/mock";

// Mock: current user is always user u1 (Aïsha Koné)
const CurrentUserContext = createContext<User>(users[0]);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  return (
    <CurrentUserContext.Provider value={users[0]}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
