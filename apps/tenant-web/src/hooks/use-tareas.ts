import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface TareaItem {
  id: string;
  titulo: string;
  estado: string;
  prioridad: string;
  fechaLimite?: string;
  cliente?: { id: string; nombre: string } | null;
}

interface UseTareasReturn {
  tareas: TareaItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  createTarea: (data: any) => Promise<void>;
  updateTarea: (id: string, data: any) => Promise<void>;
  deleteTarea: (id: string) => Promise<void>;
}

export function useTareas(): UseTareasReturn {
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetchTareas = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await api.get<TareaItem[]>('/api/v1/tenant/tareas', undefined, { auth: true });
      if (id === fetchIdRef.current) setTareas(result);
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setTareas([]);
      }
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTareas(); }, [fetchTareas]);

  const createTarea = useCallback(async (data: any) => {
    await api.post('/api/v1/tenant/tareas', data, { auth: true });
    await fetchTareas();
  }, [fetchTareas]);

  const updateTarea = useCallback(async (id: string, data: any) => {
    await api.patch(`/api/v1/tenant/tareas/${id}`, data, { auth: true });
    await fetchTareas();
  }, [fetchTareas]);

  const deleteTarea = useCallback(async (id: string) => {
    await api.patch(`/api/v1/tenant/tareas/${id}`, { estado: 'Cancelada' }, { auth: true });
    await fetchTareas();
  }, [fetchTareas]);

  return { tareas, isLoading, isError, error, refetch: fetchTareas, createTarea, updateTarea, deleteTarea };
}
