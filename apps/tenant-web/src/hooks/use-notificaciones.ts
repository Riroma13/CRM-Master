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

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/api/v1/tenant/notificaciones/${id}`, { leida: true }, { auth: true });
      setData((prev) => ({
        notificaciones: prev.notificaciones.map((n) =>
          n.id === id ? { ...n, leida: true, link: n.link } : n
        ),
        noLeidas: Math.max(0, prev.noLeidas - 1),
      }));
    } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post('/api/v1/tenant/notificaciones/leer-todas', undefined, { auth: true });
      setData((prev) => ({
        notificaciones: prev.notificaciones.map((n) => ({ ...n, leida: true })),
        noLeidas: 0,
      }));
    } catch { /* ignore */ }
  }, []);

  return { ...data, isLoading, refetch: fetch, markAsRead, markAllAsRead };
}
