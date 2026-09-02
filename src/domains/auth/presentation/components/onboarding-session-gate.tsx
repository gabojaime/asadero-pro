import { redirect } from "next/navigation";
import { getDefaultLandingRoute } from "@/domains/auth/domain/rbac";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";

export async function OnboardingSessionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getServerSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.isOnboarded && profile.role) {
    redirect(getDefaultLandingRoute(profile.role));
  }

  return children;
}
