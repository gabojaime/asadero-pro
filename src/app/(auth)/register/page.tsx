import { SignUpForm } from "@/domains/auth/presentation/components/sign-up-form";

export default function Page() {
  return (
    <main className="grid min-h-svh w-full lg:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
      <section className="relative hidden overflow-hidden bg-surface-tile p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3 text-primary-foreground"><span className="grid size-11 place-items-center bg-primary font-serif text-xl font-bold">A</span><span className="font-mono text-xs font-semibold uppercase tracking-[0.24em]">Asadero Pro</span></div>
        <div className="relative z-10 flex max-w-md flex-col gap-6"><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">El oficio, ordenado</p><h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-primary-foreground">Tu cocina, una sola visión.</h1><p className="max-w-sm text-base leading-7 text-muted-foreground">Empieza a convertir cada inventario, receta y servicio en una decisión más clara.</p></div>
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><span>Est. 2024</span><span>Hecho para el servicio</span></div>
        <div aria-hidden="true" className="absolute -bottom-32 -right-24 size-96 rounded-full border-[48px] border-primary/15" />
      </section>
      <section className="flex min-h-svh items-center justify-center bg-background p-6 md:p-10"><div className="w-full max-w-md"><SignUpForm /></div></section>
    </main>
  );
}
