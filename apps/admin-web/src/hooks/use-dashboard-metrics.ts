import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DashboardMetrics } from '@/lib/api-types';

interface UseDashboardMetricsReturn {
  data: DashboardMetrics | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboardMetrics(): UseDashboardMetricsReturn {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<DashboardMetrics>('/api/v1/admin/dashboard');
      setData(result);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isError, error, refetch };
}
