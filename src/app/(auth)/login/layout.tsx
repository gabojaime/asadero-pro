import { Suspense } from "react";
import { GuestSessionGate } from "@/domains/auth/presentation/components/guest-session-gate";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <GuestSessionGate>{children}</GuestSessionGate>
    </Suspense>
  );
}
