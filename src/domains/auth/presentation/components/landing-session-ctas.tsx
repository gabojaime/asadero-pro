import Link from "next/link";
import { cache } from "react";
import { ArrowUpRight, Menu } from "lucide-react";
import { connection } from "next/server";

import { resolveAuthenticatedEntryPath } from "@/domains/auth/domain/rbac";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { Button } from "@/shared/presentation/ui/button";

const getLandingEntryPath = cache(async () => {
  await connection();
  const profile = await getServerSessionProfile();
  return resolveAuthenticatedEntryPath(profile);
});

export function LandingNavActionsFallback() {
  return (
    <nav className="flex items-center gap-3" aria-label="Navegación principal">
      <Link
        href="#como-funciona"
        className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
      >
        Cómo funciona
      </Link>
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Acceder</Link>
      </Button>
      <Button asChild size="sm" className="hidden rounded-full px-5 sm:inline-flex">
        <Link href="/login">
          Entrar al sistema <ArrowUpRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Abrir menú">
        <Menu data-icon="inline-start" />
      </Button>
    </nav>
  );
}

export async function LandingNavActions() {
  const entryPath = await getLandingEntryPath();
  const isAuthenticated = entryPath !== "/login";
  const accessLabel = isAuthenticated ? "Ir al panel" : "Acceder";

  return (
    <nav className="flex items-center gap-3" aria-label="Navegación principal">
      <Link
        href="#como-funciona"
        className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
      >
        Cómo funciona
      </Link>
      <Button asChild variant="ghost" size="sm">
        <Link href={entryPath}>{accessLabel}</Link>
      </Button>
      <Button asChild size="sm" className="hidden rounded-full px-5 sm:inline-flex">
        <Link href={entryPath}>
          Entrar al sistema <ArrowUpRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Abrir menú">
        <Menu data-icon="inline-start" />
      </Button>
    </nav>
  );
}

export function LandingHeroCtasFallback() {
  return (
    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Button asChild size="lg" className="w-full rounded-full px-7 sm:w-auto">
        <Link href="/login">
          Iniciar sesión <ArrowUpRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="w-full rounded-full px-7 sm:w-auto">
        <Link href="#como-funciona">Conocer la plataforma</Link>
      </Button>
    </div>
  );
}

export async function LandingHeroCtas() {
  const entryPath = await getLandingEntryPath();
  const isAuthenticated = entryPath !== "/login";
  const primaryCtaLabel = isAuthenticated ? "Ir al panel" : "Iniciar sesión";

  return (
    <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Button asChild size="lg" className="w-full rounded-full px-7 sm:w-auto">
        <Link href={entryPath}>
          {primaryCtaLabel} <ArrowUpRight data-icon="inline-end" />
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="w-full rounded-full px-7 sm:w-auto">
        <Link href="#como-funciona">Conocer la plataforma</Link>
      </Button>
    </div>
  );
}

export function LandingClosingCtaFallback() {
  return (
    <Button asChild size="lg" className="mt-9 rounded-full px-8">
      <Link href="/login">
        Iniciar sesión <ArrowUpRight data-icon="inline-end" />
      </Link>
    </Button>
  );
}

export async function LandingClosingCta() {
  const entryPath = await getLandingEntryPath();
  const isAuthenticated = entryPath !== "/login";
  const primaryCtaLabel = isAuthenticated ? "Ir al panel" : "Iniciar sesión";

  return (
    <Button asChild size="lg" className="mt-9 rounded-full px-8">
      <Link href={entryPath}>
        {primaryCtaLabel} <ArrowUpRight data-icon="inline-end" />
      </Link>
    </Button>
  );
}
