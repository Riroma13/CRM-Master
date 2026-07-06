'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { MetricsBar } from '@/components/dashboard/metrics-bar';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { ClientGrid } from '@/components/dashboard/client-grid';
import type { ClientFilters } from '@/lib/api-types';

export default function DashboardPage() {
  const [filters, setFilters] = useState<ClientFilters>({
    page: 1,
    limit: 20,
  });

  const handleFiltersChange = useCallback((next: ClientFilters) => {
    setFilters(next);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <MetricsBar />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-on-surface">
          Mapa de Clientes
        </h2>
        <Button size="sm" className="gap-1.5 bg-primary text-xs text-on-primary">
          <Plus className="h-3.5 w-3.5" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <DashboardFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Client Grid */}
      <ClientGrid filters={filters} onPageChange={handlePageChange} />
    </div>
  );
}
