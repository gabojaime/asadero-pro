import { redirect } from "next/navigation";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";

export async function ProtectedSessionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.isOnboarded) {
    redirect("/onboarding");
  }

  return children;
}
