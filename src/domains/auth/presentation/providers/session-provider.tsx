"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SessionProfile, UserRole } from "@/domains/auth/domain/entities";
import { useSessionProfile } from "@/domains/auth/infrastructure/query-adapters";

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

type SessionProviderProps = {
  initialProfile: SessionProfile;
  children: ReactNode;
};

export function SessionProvider({
  initialProfile,
  children,
}: SessionProviderProps) {
  const { data, isLoading, isError } = useSessionProfile(
    initialProfile.userId,
    initialProfile.email,
  );

  const profile = data ?? initialProfile;

  if (!profile.merchantId || !profile.role) {
    return null;
  }

  const value: SessionContextValue = {
    userId: profile.userId,
    email: profile.email,
    merchantId: profile.merchantId,
    merchantName: profile.merchantName,
    fullName: profile.fullName,
    role: profile.role,
    isLoading,
    isError,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
