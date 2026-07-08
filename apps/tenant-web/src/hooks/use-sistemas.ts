import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface SistemaItem {
  id: string;
  nombreSistema: string;
  tipo: string;
  estadoTecnico: string;
  entorno?: string;
  version?: string;
  cliente?: { id: string; nombre: string } | null;
  _count?: { items: number };
  items?: any[];
}

export function useSistemas(clienteId?: string) {
  const [sistemas, setSistemas] = useState<SistemaItem[]>([]);
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
      if (clienteId) params.clienteId = clienteId;
      const result = await api.get<SistemaItem[]>('/api/v1/tenant/sistemas', params, { auth: true });
      if (id === fetchIdRef.current) setSistemas(result);
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Error al cargar sistemas'));
        setSistemas([]);
      }
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, [clienteId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { sistemas, isLoading, isError, error, refetch: fetch };
}
