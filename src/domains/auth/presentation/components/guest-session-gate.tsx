import { redirect } from "next/navigation";
import { connection } from "next/server";
import { resolveAuthenticatedEntryPath } from "@/domains/auth/domain/rbac";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";

export async function GuestSessionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const profile = await getServerSessionProfile();

  if (profile) {
    redirect(resolveAuthenticatedEntryPath(profile));
  }

  return children;
}
