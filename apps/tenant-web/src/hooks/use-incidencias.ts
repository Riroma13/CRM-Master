import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface IncidenciaItem {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: string;
  prioridad: string;
  asignadoA?: string;
  fechaLimite?: string;
  createdAt: string;
  cliente?: { id: string; nombre: string } | null;
}

export function useIncidencias(filters?: { estado?: string; prioridad?: string }) {
  const [incidencias, setIncidencias] = useState<IncidenciaItem[]>([]);
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
      if (filters?.estado) params.estado = filters.estado;
      if (filters?.prioridad) params.prioridad = filters.prioridad;
      const result = await api.get<IncidenciaItem[]>('/api/v1/tenant/incidencias', params, { auth: true });
      if (id === fetchIdRef.current) setIncidencias(result);
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Error al cargar incidencias'));
        setIncidencias([]);
      }
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, [filters?.estado, filters?.prioridad]);

  useEffect(() => { fetch(); }, [fetch]);
  return { incidencias, isLoading, isError, error, refetch: fetch };
}
