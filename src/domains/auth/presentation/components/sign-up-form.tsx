"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/shared/infrastructure/supabase/client";
import { AsaderoLogo } from "@/shared/presentation/asadero-logo";
import { Button } from "@/shared/presentation/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/presentation/ui/card";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    if (password !== repeatPassword) { setError("Las contraseñas no coinciden"); setIsLoading(false); return; }
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/onboarding` } });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally { setIsLoading(false); }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/80 bg-card/95 shadow-xl shadow-primary/5">
        <CardHeader className="gap-4 p-7 pb-5">
          <div className="flex items-center gap-3 text-primary"><AsaderoLogo /><span className="font-mono text-xs font-semibold uppercase tracking-[0.24em]">Asadero Pro</span></div>
          <div className="flex flex-col gap-2"><CardTitle className="font-mono text-3xl tracking-tight">Entra en la cocina.</CardTitle><CardDescription>Crea tu acceso para ordenar la operación con precisión.</CardDescription></div>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          <form onSubmit={handleSignUp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" type="email" placeholder="chef@asadero.pro" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="repeat-password">Repite la contraseña</Label><Input id="repeat-password" type="password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Preparando acceso..." : "Crear acceso"}</Button>
            <p className="text-center text-sm text-muted-foreground">¿Ya tienes cuenta? <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Inicia sesión</Link></p>
          </form>
        </CardContent>
      </Card>
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">El oficio también se organiza</p>
    </div>
  );
}
