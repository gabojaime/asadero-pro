"use client";

import { cn } from "@/lib/utils";
import { AsaderoLogo } from "@/shared/presentation/asadero-logo";
import { Button } from "@/shared/presentation/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/presentation/ui/card";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";
import {
  fetchClientSessionProfile,
  useSignIn,
} from "@/domains/auth/infrastructure/query-adapters";
import { getDefaultLandingRoute } from "@/domains/auth/domain/rbac";
import { AuthError } from "@/domains/auth/domain/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const signInMutation = useSignIn();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    try {
      const result = await signInMutation.mutateAsync({ email, password });
      const profile = await fetchClientSessionProfile(result.userId, result.email);

      if (profile.isOnboarded && profile.role) {
        router.push(getDefaultLandingRoute(profile.role));
        return;
      }

      router.push("/dashboard");
    } catch (caughtError: unknown) {
      if (caughtError instanceof AuthError) {
        setError(caughtError.message);
        setFieldErrors(caughtError.fieldErrors ?? {});
        return;
      }

      const mutationError = caughtError as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };

      setError(mutationError.message ?? "Ocurrió un error al iniciar sesión.");
      setFieldErrors(mutationError.fieldErrors ?? {});
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-lg border border-border bg-card shadow-none">
        <CardHeader className="gap-4 p-7 pb-5">
          <div className="flex items-center gap-3 text-primary">
            <AsaderoLogo />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.24em]">Asadero Pro</span>
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle className="text-[28px] font-semibold leading-8 tracking-tight">Vuelve al fuego.</CardTitle>
            <CardDescription>Accede a tu operación y mantén cada servicio bajo control.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="chef@asadero.pro"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? (
                <p className="text-sm text-destructive">{fieldErrors.email}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  ¿La olvidaste?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              {fieldErrors.password ? (
                <p className="text-sm text-destructive">{fieldErrors.password}</p>
              ) : null}
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={signInMutation.isPending}>
              {signInMutation.isPending ? "Abriendo cocina..." : "Entrar al sistema"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Aún no tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
              >
                Solicita acceso
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Precisión para el oficio diario
      </p>
    </div>
  );
}
