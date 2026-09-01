import { DeployButton } from "@/shared/presentation/deploy-button";
import { EnvVarWarning } from "@/shared/presentation/env-var-warning";
import { AuthButton } from "@/shared/presentation/auth-button";
import { ThemeSwitcher } from "@/shared/presentation/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { ProtectedSessionGate } from "@/domains/auth/presentation/components/protected-session-gate";
import Link from "next/link";
import { Suspense } from "react";

export const instant = false;

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"}>Next.js Supabase Starter</Link>
              <div className="flex items-center gap-2">
                <DeployButton />
              </div>
            </div>
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <Suspense
          fallback={
            <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5 animate-pulse">
              <div className="h-8 w-48 rounded bg-muted" />
              <div className="h-64 rounded bg-muted" />
            </div>
          }
        >
          <ProtectedSessionGate>
            <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
              {children}
            </div>
          </ProtectedSessionGate>
        </Suspense>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Powered by{" "}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
