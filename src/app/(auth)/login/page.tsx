import { LoginForm } from "@/domains/auth/presentation/components/login-form";

export default function Page() {
  return (
    <main className="grid min-h-svh w-full lg:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
      <section className="relative hidden overflow-hidden bg-surface-tile p-10 text-surface-tile-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3 text-primary-foreground"><span className="grid size-11 place-items-center bg-primary font-serif text-xl font-bold">A</span><span className="font-mono text-xs font-semibold uppercase tracking-[0.24em]">Asadero Pro</span></div>
        <div className="relative z-10 flex max-w-md flex-col gap-6"><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Control de operación</p><h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-primary-foreground">El fuego exige precisión.</h1><p className="max-w-sm text-base leading-7 text-surface-muted">Una herramienta para quienes convierten el oficio diario en una operación que siempre está lista.</p></div>
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-surface-muted"><span>Est. 2024</span><span>Hecho para el servicio</span></div>
        <div aria-hidden="true" className="absolute -bottom-32 -right-24 size-96 rounded-full border-[48px] border-primary/15" />
      </section>
      <section className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10"><div className="w-full max-w-md"><LoginForm /></div></section>
    </main>
  );
}
