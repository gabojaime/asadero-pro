import { OnboardingForm } from "@/domains/merchants/presentation/components/onboarding-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configura tu asadero | Asadero Pro",
  description: "Completa la configuración de tu negocio para empezar a operar.",
};

export const instant = false;

export default function OnboardingPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <OnboardingForm />
      </div>
    </main>
  );
}
