import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface ModuleDef {
  id: string;
  label: string;
  defaultEnabled: boolean;
}

export function useModules() {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [available, setAvailable] = useState<ModuleDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    try {
      const result = await api.get<{ available: ModuleDef[]; enabled: string[] }>(
        '/api/v1/tenant/modules', undefined, { auth: true },
      );
      if (id === fetchIdRef.current) {
        setAvailable(result.available);
        setEnabled(result.enabled);
      }
    } catch {
      if (id === fetchIdRef.current) {
        // Default: all enabled
        const all = ['dashboard', 'clientes', 'documentos', 'tareas', 'calendario', 'recursos', 'sistemas', 'perfil'];
        setAvailable(all.map((id) => ({ id, label: id, defaultEnabled: true })));
        setEnabled(all);
      }
    } finally {
      if (id === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const isEnabled = useCallback((moduleId: string) => enabled.includes(moduleId), [enabled]);

  return { available, enabled, isLoading, isEnabled, refetch: fetch };
}
