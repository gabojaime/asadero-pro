import { buildDashboardSnapshot } from "@/domains/metrics/application/use-cases";
import { resolvePeriodBounds } from "@/domains/metrics/domain/period-bounds";
import { parseDashboardPeriod } from "@/domains/metrics/domain/validations";
import { createMetricsReadRepository } from "@/domains/metrics/infrastructure/supabase-metrics-read-repo";
import { DashboardView } from "@/domains/metrics/presentation/DashboardView";
import { getServerSessionProfile } from "@/domains/auth/infrastructure/session-profile-server";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { redirect } from "next/navigation";

type DashboardPageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const profile = await getServerSessionProfile();
  if (!profile?.merchantId || profile.role !== "admin") {
    redirect("/orders");
  }

  const params = await searchParams;
  const period = parseDashboardPeriod(params.period);
  const bounds = resolvePeriodBounds(period);

  const supabase = await createClient();
  const repo = createMetricsReadRepository(supabase);
  const snapshot = await buildDashboardSnapshot(
    profile.merchantId,
    bounds,
    repo,
  );

  return <DashboardView snapshot={snapshot} />;
}
