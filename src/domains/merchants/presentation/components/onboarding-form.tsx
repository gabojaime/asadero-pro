"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useBootstrapSessionProfile } from "@/domains/auth/infrastructure/query-adapters";
import { getDefaultLandingRoute } from "@/domains/auth/domain/rbac";
import {
  AlreadyOnboardedError,
  NotAuthenticatedError,
  OnboardingValidationError,
} from "@/domains/merchants/domain/errors";
import { useCompleteOnboarding } from "@/domains/merchants/infrastructure/query-adapters";
import { LogoutButton } from "@/domains/auth/presentation/components/logout-button";
import { Button } from "@/shared/presentation/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/presentation/ui/card";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";

const GENERIC_ERROR =
  "No pudimos completar el registro. Intenta de nuevo.";

export function OnboardingForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const { data: sessionProfile } = useBootstrapSessionProfile();
  const userId = sessionProfile?.queryUserId;
  const completeOnboarding = useCompleteOnboarding(userId);

  const [merchantName, setMerchantName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    try {
      await completeOnboarding.mutateAsync({
        merchantName,
        ownerFullName,
        address,
        phone,
      });
      router.push(getDefaultLandingRoute("admin"));
      router.refresh();
    } catch (error) {
      if (error instanceof OnboardingValidationError) {
        setFieldErrors(error.fieldErrors);
        return;
      }

      if (error instanceof AlreadyOnboardedError) {
        router.push(getDefaultLandingRoute("admin"));
        router.refresh();
        return;
      }

      if (error instanceof NotAuthenticatedError) {
        router.push("/login");
        return;
      }

      setFormError(GENERIC_ERROR);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-lg border border-border">
        <CardHeader className="gap-3 p-7 pb-5">
          <CardTitle className="text-[28px] font-semibold tracking-tight">
            Configura tu asadero
          </CardTitle>
          <CardDescription className="text-[15px] leading-5">
            Cuéntanos sobre tu negocio para empezar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="merchant-name">Nombre del negocio</Label>
              <Input
                id="merchant-name"
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
                autoComplete="organization"
              />
              {fieldErrors.merchantName && (
                <p role="alert" className="text-sm text-destructive">
                  {fieldErrors.merchantName}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Dirección (opcional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                autoComplete="street-address"
              />
              {fieldErrors.address && (
                <p role="alert" className="text-sm text-destructive">
                  {fieldErrors.address}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
              />
              {fieldErrors.phone && (
                <p role="alert" className="text-sm text-destructive">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="owner-full-name">Tu nombre completo</Label>
              <Input
                id="owner-full-name"
                value={ownerFullName}
                onChange={(event) => setOwnerFullName(event.target.value)}
                autoComplete="name"
              />
              {fieldErrors.ownerFullName && (
                <p role="alert" className="text-sm text-destructive">
                  {fieldErrors.ownerFullName}
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={completeOnboarding.isPending}
            >
              {completeOnboarding.isPending
                ? "Creando tu espacio..."
                : "Crear mi espacio"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <LogoutButton />
      </div>
    </div>
  );
}
