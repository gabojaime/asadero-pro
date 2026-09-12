"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UserRole } from "@/domains/auth/domain/entities";

export type SessionContextValue = {
  userId: string;
  email: string;
  merchantId: string;
  merchantName: string | null;
  fullName: string | null;
  role: UserRole;
  isLoading: boolean;
  isError: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}

/** Test-only provider for RTL integration without live Supabase session queries. */
export function TestSessionProvider({
  value,
  children,
}: {
  value: SessionContextValue;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export { SessionContext };
