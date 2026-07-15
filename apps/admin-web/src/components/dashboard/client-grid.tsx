'use client';

import { useClients } from '@/hooks/use-clients';
import { ClientCard } from './client-card';
import { Pagination } from './pagination';
import { Button } from '@crm-master/ui';
import type { ClientFilters } from '@/lib/api-types';
import { useMemo } from 'react';

function CardSkeleton() {
  return (
    <div className="h-[260px] animate-pulse rounded-[0.5rem] border border-border-subtle bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 w-3/5 rounded bg-surface-container" />
        <div className="h-5 w-16 rounded bg-surface-container" />
      </div>
      <div className="h-3 w-2/5 rounded bg-surface-container mb-2" />
      <div className="mb-3 border-t border-border-subtle" />
      <div className="h-4 w-3/4 rounded bg-surface-container mb-6" />
      <div className="flex flex-wrap gap-1.5 mb-3">
        <div className="h-5 w-14 rounded bg-surface-container" />
        <div className="h-5 w-20 rounded bg-surface-container" />
        <div className="h-5 w-12 rounded bg-surface-container" />
      </div>
      <div className="h-4 w-2/3 rounded bg-surface-container mb-3" />
      <div className="h-8 w-full rounded bg-surface-container" />
    </div>
  );
}

const SKELETON_COUNT = 6;

interface ClientGridProps {
  filters: ClientFilters;
  onPageChange: (page: number) => void;
}

export function ClientGrid({ filters, onPageChange }: ClientGridProps) {
  const { data, pagination, isLoading, isError, error, refetch } =
    useClients(filters);

  const skeletons = useMemo(
    () => Array.from({ length: SKELETON_COUNT }, (_, i) => i),
    [],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {skeletons.map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[0.5rem] border border-critical/30 bg-critical/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-critical">Error loading clients</p>
            <p className="text-xs text-on-surface-variant">
              {error?.message ?? 'Failed to fetch client list'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-outline-variant bg-white p-12">
        <p className="text-sm font-semibold text-on-surface-variant">
          No clients found
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          {filters.search || filters.salud || filters.tag
            ? 'Try adjusting your search or filters'
            : 'No clients registered yet'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            pagination={pagination}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
