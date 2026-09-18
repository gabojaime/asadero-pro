import Link from "next/link";
import type { DashboardSnapshot } from "../domain/entities";
import { formatMoneyUsdEs } from "@/domains/orders/presentation/format-money";
import { MetricTile } from "./MetricTile";
import { Suspense } from "react";
import { PeriodSelector } from "./PeriodSelector";
import { DashboardSettingsStrip } from "./DashboardSettingsStrip";
import {
  AvgTicketSparkChart,
  BepGaugeChart,
  ContributionRankChart,
  FoodCostTrendChart,
  SessionHeatmapChart,
  TicketTimeTrendChart,
  TurnoverByDowChart,
  WasteMixChart,
} from "./charts/lazy-charts";

export function DashboardView({ snapshot }: { snapshot: DashboardSnapshot }) {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold leading-8 tracking-tight">
            Panel de control
          </h1>
          <p className="text-sm text-muted-foreground">{snapshot.periodLabel}</p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector current={snapshot.period} />
        </Suspense>
      </header>

      <DashboardSettingsStrip settings={snapshot.settings} />

      <section className="space-y-4">
        <h2 className="text-[20px] font-semibold tracking-tight">Financiero</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Costo de alimentos"
            value={
              snapshot.foodCostPct !== null
                ? `${snapshot.foodCostPct.toFixed(1)}%`
                : "—"
            }
            caption={snapshot.foodCostCaption}
            alert={snapshot.foodCostAlert}
          />
          <MetricTile
            label="Punto de equilibrio (MTD)"
            value={
              snapshot.bepRevenue !== null
                ? formatMoneyUsdEs(snapshot.bepRevenue)
                : "—"
            }
            caption={snapshot.bepCaption}
          />
          <MetricTile
            label="Porciones al equilibrio"
            value={
              snapshot.bepPortionsRemaining !== null
                ? String(snapshot.bepPortionsRemaining)
                : "—"
            }
            caption={snapshot.bepPortionsCaption}
          />
          <MetricTile
            label="Ticket promedio"
            value={
              snapshot.averageTicket !== null
                ? formatMoneyUsdEs(snapshot.averageTicket)
                : "—"
            }
            caption={snapshot.averageTicketCaption}
          />
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Tendencia costo de alimentos (%)
            </p>
            <FoodCostTrendChart snapshot={snapshot} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Margen de contribución por plato
            </p>
            <ContributionRankChart snapshot={snapshot} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Progreso hacia equilibrio
            </p>
            <BepGaugeChart snapshot={snapshot} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Ticket promedio diario
            </p>
            <AvgTicketSparkChart snapshot={snapshot} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[20px] font-semibold tracking-tight">Operacional</h2>
          <Link
            href="/waste-log"
            className="text-[13px] font-semibold text-primary"
          >
            Ver registro de merma →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricTile
            label="Merma (kg)"
            value={
              snapshot.wastePct !== null
                ? `${snapshot.wastePct.toFixed(1)}%`
                : "—"
            }
            caption={snapshot.wasteCaption}
            alert={snapshot.wasteAlert}
          />
          <MetricTile
            label="Tiempo en cocina"
            value={
              snapshot.ticketTimeMedian !== null
                ? `${snapshot.ticketTimeMedian} min`
                : "—"
            }
            caption={snapshot.ticketTimeCaption}
            alert={snapshot.ticketTimeAlert}
          />
          <MetricTile
            label="Ventas netas"
            value={formatMoneyUsdEs(snapshot.netSales)}
            caption={`${snapshot.completedOrderCount} pedidos cerrados`}
          />
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Mix de merma por motivo
            </p>
            <WasteMixChart snapshot={snapshot} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Mediana diaria en cocina (min)
            </p>
            <TicketTimeTrendChart snapshot={snapshot} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Horas muertas (dine-in)
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {snapshot.heatmapCaption}
            </p>
            <SessionHeatmapChart snapshot={snapshot} />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
              Rotación de mesas
            </p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {snapshot.turnoverCaption}
            </p>
            <TurnoverByDowChart snapshot={snapshot} />
          </div>
        </div>
      </section>
    </div>
  );
}
