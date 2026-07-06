'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClientFilters } from '@/lib/api-types';

interface DashboardFiltersProps {
  filters: ClientFilters;
  onFiltersChange: (filters: ClientFilters) => void;
}

type SaludOption = '🟢' | '🟡' | '🔴';

const SALUD_OPTIONS: SaludOption[] = ['🟢', '🟡', '🔴'];
const SALUD_LABELS: Record<SaludOption, string> = {
  '🟢': 'Buena',
  '🟡': 'Media',
  '🔴': 'Crítica',
};

export function DashboardFilters({ filters, onFiltersChange }: DashboardFiltersProps) {
  const [search, setSearch] = useState(filters.search ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external filter changes (e.g., on reset)
  useEffect(() => {
    setSearch(filters.search ?? '');
  }, [filters.search]);

  const emitSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onFiltersChange({ ...filters, search: value || undefined, page: 1 });
      }, 300);
    },
    [filters, onFiltersChange],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);
      emitSearch(value);
    },
    [emitSearch],
  );

  const handleSaludToggle = useCallback(
    (salud: SaludOption) => {
      const next = filters.salud === salud ? undefined : salud;
      onFiltersChange({ ...filters, salud: next, page: 1 });
    },
    [filters, onFiltersChange],
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    onFiltersChange({ page: 1, limit: filters.limit });
  }, [filters.limit, onFiltersChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasActiveFilters =
    (filters.search ?? '') !== '' || filters.salud !== undefined || filters.tag !== undefined;

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
            aria-label="Search clients"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
          Health:
        </span>
        {SALUD_OPTIONS.map((salud) => {
          const isActive = filters.salud === salud;
          return (
            <button
              key={salud}
              onClick={() => handleSaludToggle(salud)}
              className={`inline-flex items-center gap-1 rounded-[0.25rem] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] transition-colors ${
                isActive
                  ? salud === '🟢'
                    ? 'bg-success/20 text-success'
                    : salud === '🟡'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-critical/20 text-critical'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
              aria-pressed={isActive}
            >
              {salud} {SALUD_LABELS[salud]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
