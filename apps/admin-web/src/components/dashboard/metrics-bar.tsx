'use client';

import {
  Users,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics';
import { KpiCard } from './kpi-card';
import { Button } from '@/components/ui/button';

function KpiSkeleton() {
  return (
    <div className="h-[100px] animate-pulse rounded-[0.5rem] border border-border-subtle bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-surface-container" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-surface-container" />
          <div className="h-8 w-24 rounded bg-surface-container" />
        </div>
      </div>
    </div>
  );
}

export function MetricsBar() {
  const { data, isLoading, isError, error, refetch } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[0.5rem] border border-critical/30 bg-critical/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-critical">Error loading metrics</p>
            <p className="text-xs text-on-surface-variant">
              {error?.message ?? 'Failed to fetch dashboard metrics'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard
        icon={Users}
        label="Active Clients"
        value={m?.activos ?? 0}
        subtitle={m ? `out of ${m.totalClientes} total` : undefined}
      />
      <KpiCard
        icon={AlertTriangle}
        label="With Incidents"
        value={m?.conIncidencias ?? 0}
        subtitle={m && m.conIncidencias > 0 ? 'Needs attention' : undefined}
      />
      <KpiCard
        icon={AlertCircle}
        label="Critical"
        value={m?.criticos ?? 0}
        subtitle={m && m.criticos > 0 ? 'Immediate action' : undefined}
      />
      <KpiCard
        icon={ClipboardList}
        label="Pending Tasks"
        value={m?.tareasPendientesGlobales ?? 0}
        subtitle={m ? `across ${m.tenantsActivos} tenants` : undefined}
      />
    </div>
  );
}
