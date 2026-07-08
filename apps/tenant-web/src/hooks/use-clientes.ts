import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface ClienteListItem {
  id: string;
  nombre: string;
  estadoRelacion: string;
  saludGeneral: string;
  tipoNegocio?: string;
  tags: string[];
  _count: { sistemas: number; tareas: number };
}

interface UseClientesReturn {
  clientes: ClienteListItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useClientes(filters?: { search?: string; estado?: string; salud?: string }): UseClientesReturn {
  const [clientes, setClientes] = useState<ClienteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetchClientes = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.estado) params.estado = filters.estado;
      if (filters?.salud) params.salud = filters.salud;

      const result = await api.get<ClienteListItem[]>('/api/v1/tenant/clientes', params, { auth: true });
      if (id === fetchIdRef.current) {
        setClientes(result);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setClientes([]);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters?.search, filters?.estado, filters?.salud]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const refetch = useCallback(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, isLoading, isError, error, refetch };
}
