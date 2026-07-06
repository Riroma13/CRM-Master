import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ClientFilters, ClientListResponse, ClienteListItem, PaginationMeta } from '@/lib/api-types';

interface UseClientsReturn {
  data: ClienteListItem[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

function isNonPageFilterChange(
  prev: ClientFilters,
  next: ClientFilters,
): boolean {
  const keys: (keyof ClientFilters)[] = ['search', 'salud', 'estado', 'tag', 'limit'];
  return keys.some((key) => prev[key] !== next[key]);
}

export function useClients(filters: ClientFilters): UseClientsReturn {
  const [data, setData] = useState<ClienteListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track previous filters to detect non-page changes
  const prevFiltersRef = useRef<ClientFilters>(filters);

  // Build effective filters: reset page to 1 when a non-page filter changes
  const effectiveFilters: ClientFilters = (() => {
    if (isNonPageFilterChange(prevFiltersRef.current, filters)) {
      return { ...filters, page: 1 };
    }
    return filters;
  })();

  // Update ref after computing effective filters
  const filtersRef = useRef(effectiveFilters);
  filtersRef.current = effectiveFilters;

  const fetchData = useCallback(async (f: ClientFilters) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await api.get<ClientListResponse>(
        '/api/v1/admin/clientes',
        f as Record<string, string | number | undefined>,
      );
      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced fetch: 300ms on search changes, immediate on other changes
  useEffect(() => {
    prevFiltersRef.current = filters;

    const timer = setTimeout(() => {
      fetchData(effectiveFilters);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveFilters.page,
    effectiveFilters.limit,
    effectiveFilters.search,
    effectiveFilters.salud,
    effectiveFilters.estado,
    effectiveFilters.tag,
    fetchData,
  ]);

  const refetch = useCallback(() => {
    fetchData(filtersRef.current);
  }, [fetchData]);

  return { data, pagination, isLoading, isError, error, refetch };
}
