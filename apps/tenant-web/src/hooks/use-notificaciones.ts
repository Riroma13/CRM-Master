import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  createdAt: string;
  leida: boolean;
  link: string;
}

interface NotificacionesResponse {
  notificaciones: Notificacion[];
  noLeidas: number;
}

export function useNotificaciones() {
  const [data, setData] = useState<NotificacionesResponse>({ notificaciones: [], noLeidas: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const result = await api.get<NotificacionesResponse>('/api/v1/tenant/notificaciones', undefined, { auth: true });
      if (id === fetchIdRef.current) setData(result);
    } catch {
      if (id === fetchIdRef.current) setData({ notificaciones: [], noLeidas: 0 });
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { ...data, isLoading, refetch: fetch };
}
