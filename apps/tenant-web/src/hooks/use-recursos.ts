import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface ResourceItem {
  id: string;
  nombre: string;
  tipo: string;
  descripcion?: string;
  isActive: boolean;
  _count?: { citas: number };
}

export function useRecursos(tipo?: string) {
  const [recursos, setRecursos] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (tipo) params.tipo = tipo;
      const result = await api.get<ResourceItem[]>('/api/v1/tenant/recursos', params, { auth: true });
      if (id === fetchIdRef.current) setRecursos(result);
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Error al cargar recursos'));
        setRecursos([]);
      }
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, [tipo]);

  useEffect(() => { fetch(); }, [fetch]);
  return { recursos, isLoading, isError, error, refetch: fetch };
}
