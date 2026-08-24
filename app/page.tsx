import Link from "next/link";
import { ArrowUpRight, Check, Flame, Gauge, Menu, Scale, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { label: "Food Cost", value: "32.4%", note: "Dentro del objetivo", icon: Gauge },
  { label: "Margen · Ribeye", value: "68.2%", note: "+4.8% esta semana", icon: TrendingUp },
  { label: "Inventario crudo", value: "842.350 kg", note: "Actualizado hace 2 min", icon: Scale },
];

const features = [
  ["Control de merma", "Registra cada porción quemada, grasa retirada o corte imperfecto. La rentabilidad empieza donde otros sistemas dejan de mirar."],
  ["Recetas parametrizadas", "Conecta compras, inventario en crudo y porciones cocidas con precisión de tres decimales."],
  ["Decisiones en tiempo real", "Visualiza el costo de alimentos, el margen por corte y la operación de sala sin hojas de cálculo."],
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Asadero Pro, inicio">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Flame aria-hidden="true" data-icon="inline-start" />
      </span>
      <span className="text-base font-semibold tracking-[-0.03em]">Asadero <span className="text-primary">Pro</span></span>
    </Link>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-surface-tile p-2 shadow-2xl shadow-black/20 sm:p-3">
      <div className="flex items-center justify-between rounded-t-lg bg-surface-tile-2 px-4 py-3 text-xs text-surface-muted">
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /><span>Panel operativo</span></div>
        <span>Hoy, 24 agosto 2026</span>
      </div>
      <div className="grid gap-3 bg-surface-tile p-3 sm:p-5 lg:grid-cols-[190px_1fr]">
        <aside className="hidden rounded-lg bg-black/20 p-4 lg:block">
          <p className="mb-8 text-xs font-semibold text-white">ASADERO PRO</p>
          <div className="flex flex-col gap-4 text-xs text-surface-muted"><span className="rounded-md bg-white/10 px-3 py-2 text-white">Resumen</span><span>Inventario</span><span>Recetas</span><span>Mermas</span><span>Reportes</span></div>
        </aside>
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {metrics.map(({ label, value, note, icon: Icon }) => (
              <Card key={label} className="border-white/10 bg-surface-tile-2 text-white shadow-none">
                <CardHeader className="gap-3 p-4"><div className="flex items-center justify-between"><CardTitle className="text-xs font-normal text-surface-muted">{label}</CardTitle><Icon className="text-primary" aria-hidden="true" /></div><p className="text-2xl font-semibold tracking-[-0.04em]">{value}</p></CardHeader>
                <CardContent className="px-4 pb-4 text-xs text-surface-muted">{note}</CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-white/10 bg-surface-tile-2 text-white shadow-none"><CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Costo de alimentos</CardTitle></CardHeader><CardContent className="p-4 pt-2"><div className="flex h-36 items-end gap-2 border-b border-white/10 bg-[linear-gradient(to_top,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[length:100%_36px] px-2 pb-0 sm:h-44">{[42, 58, 49, 68, 61, 74, 66, 82, 78, 88, 76, 92].map((height, index) => <span key={index} className="flex-1 rounded-t-sm bg-primary/80" style={{ height: `${height}%` }} />)}</div><div className="mt-3 flex justify-between text-[10px] text-surface-muted"><span>01 AGO</span><span>08 AGO</span><span>15 AGO</span><span>24 AGO</span></div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-3" aria-label="Navegación principal"><Link href="#como-funciona" className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">Cómo funciona</Link><Button asChild variant="ghost" size="sm"><Link href="/auth/login">Acceder</Link></Button><Button asChild size="sm" className="hidden rounded-full px-5 sm:inline-flex"><Link href="/auth/login">Entrar al sistema <ArrowUpRight data-icon="inline-end" /></Link></Button><Button variant="ghost" size="icon" className="sm:hidden" aria-label="Abrir menú"><Menu data-icon="inline-start" /></Button></nav>
      </header>

      <section className="bg-background px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24"><div className="mx-auto max-w-5xl text-center"><Badge variant="outline" className="rounded-full border-primary/30 px-3 py-1 font-normal text-primary">Ingeniería para el oficio</Badge><h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.065em] sm:text-7xl lg:text-8xl">El control de tu asadero, <span className="text-primary">a punto.</span></h1><p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">Asadero Pro convierte cada kilogramo, receta y merma en decisiones claras para proteger el margen de tu cocina.</p><div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="w-full rounded-full px-7 sm:w-auto"><Link href="/auth/login">Iniciar sesión <ArrowUpRight data-icon="inline-end" /></Link></Button><Button asChild size="lg" variant="outline" className="w-full rounded-full px-7 sm:w-auto"><Link href="#como-funciona">Conocer la plataforma</Link></Button></div></div><div className="mx-auto mt-16 max-w-6xl sm:mt-24"><DashboardPreview /></div></section>

      <section id="como-funciona" className="bg-surface-parchment px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-sm font-semibold text-primary">La merma es dinero quemado</p><h2 className="mt-4 max-w-xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Precisión donde el asadero realmente gana.</h2></div><p className="max-w-md text-base leading-7 text-muted-foreground">No necesitas más datos. Necesitas los datos correctos: cuánto entró crudo, cuánto se transformó y cuánto llegó al plato.</p></div><div className="mx-auto mt-14 grid max-w-6xl gap-px overflow-hidden rounded-xl bg-border md:grid-cols-3">{features.map(([title, description]) => <article key={title} className="bg-background p-7 sm:p-9"><h3 className="text-xl font-semibold tracking-[-0.035em]">{title}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p><Check className="mt-10 text-primary" aria-hidden="true" /></article>)}</div></section>

      <section className="bg-surface-tile px-5 py-20 text-white sm:px-8 sm:py-28"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">Una operación que responde</p><h2 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Del inventario en crudo al margen real.</h2></div><p className="max-w-xs text-sm leading-6 text-surface-muted">Tres métricas para leer el pulso de tu negocio sin ruido.</p></div><div className="mt-14 grid gap-3 md:grid-cols-3">{metrics.map(({ label, value, note }) => <div key={label} className="rounded-xl bg-surface-tile-2 p-6"><p className="text-sm text-surface-muted">{label}</p><p className="mt-8 text-4xl font-light tracking-[-0.06em]">{value}</p><p className="mt-3 text-sm text-surface-muted">{note}</p></div>)}</div></div></section>

      <section className="bg-background px-5 py-24 text-center sm:px-8 sm:py-32"><div className="mx-auto max-w-3xl"><p className="text-sm font-semibold text-primary">Tu siguiente servicio empieza aquí</p><h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">Más control. Menos intuición.</h2><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground">Entra a Asadero Pro y lleva la precisión del oficio a cada decisión de tu operación.</p><Button asChild size="lg" className="mt-9 rounded-full px-8"><Link href="/auth/login">Iniciar sesión <ArrowUpRight data-icon="inline-end" /></Link></Button></div></section>
      <footer className="border-t bg-background px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><Logo /><p>Precisión para el oficio.</p></div></footer>
    </main>
  );
}
