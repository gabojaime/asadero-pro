import { Suspense } from "react";
import { OnboardingSessionGate } from "@/domains/auth/presentation/components/onboarding-session-gate";

export const instant = false;

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <OnboardingSessionGate>{children}</OnboardingSessionGate>
    </Suspense>
  );
}
