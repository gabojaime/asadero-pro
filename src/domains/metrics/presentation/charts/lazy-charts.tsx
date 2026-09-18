"use client";

import dynamic from "next/dynamic";
import { DashboardChartSkeleton } from "../dashboard-chart-skeleton";

export const FoodCostTrendChart = dynamic(
  () =>
    import("./FoodCostTrendChartPanel").then(
      (module) => module.FoodCostTrendChartPanel,
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const ContributionRankChart = dynamic(
  () =>
    import("./ContributionRankChartPanel").then(
      (module) => module.ContributionRankChartPanel,
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const BepGaugeChart = dynamic(
  () =>
    import("./BepGaugeChartPanel").then((module) => module.BepGaugeChartPanel),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const WasteMixChart = dynamic(
  () =>
    import("./WasteMixChartPanel").then((module) => module.WasteMixChartPanel),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const AvgTicketSparkChart = dynamic(
  () =>
    import("./AvgTicketSparkChartPanel").then(
      (module) => module.AvgTicketSparkChartPanel,
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const TicketTimeTrendChart = dynamic(
  () =>
    import("./TicketTimeTrendChartPanel").then(
      (module) => module.TicketTimeTrendChartPanel,
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const SessionHeatmapChart = dynamic(
  () =>
    import("./SessionHeatmapChartPanel").then(
      (module) => module.SessionHeatmapChartPanel,
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);

export const TurnoverByDowChart = dynamic(
  () =>
    import("./TurnoverByDowChartPanel").then(
      (module) => module.TurnoverByDowChartPanel,
    ),
  { ssr: false, loading: () => <DashboardChartSkeleton /> },
);
