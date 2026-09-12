"use client";

import type { ReactNode } from "react";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import { useSessionProfile } from "@/domains/auth/infrastructure/query-adapters";
import {
  SessionContext,
  type SessionContextValue,
} from "./session-context";

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

export { useSession, TestSessionProvider } from "./session-context";
export type { SessionContextValue } from "./session-context";
