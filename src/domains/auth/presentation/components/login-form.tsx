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

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-border/80 bg-card/95 shadow-xl shadow-primary/5">
        <CardHeader className="gap-4 p-7 pb-5">
          <div className="flex items-center gap-3 text-primary">
            <AsaderoLogo />
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.24em]">Asadero Pro</span>
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle className="font-mono text-3xl tracking-tight">Vuelve al fuego.</CardTitle>
            <CardDescription>Accede a tu operación y mantén cada servicio bajo control.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-7 pt-0">
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2"><Label htmlFor="email">Correo electrónico</Label><Input id="email" type="email" placeholder="chef@asadero.pro" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="flex flex-col gap-2"><div className="flex items-center justify-between"><Label htmlFor="password">Contraseña</Label><Link href="/auth/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">¿La olvidaste?</Link></div><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? "Abriendo cocina..." : "Entrar al sistema"}</Button>
            <p className="text-center text-sm text-muted-foreground">¿Aún no tienes cuenta? <Link href="/register" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">Solicita acceso</Link></p>
          </form>
        </CardContent>
      </Card>
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Precisión para el oficio diario</p>
    </div>
  );
}
