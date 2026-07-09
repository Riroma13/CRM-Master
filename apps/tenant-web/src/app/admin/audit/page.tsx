'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RefreshCw } from 'lucide-react';

interface AuditEntry {
  id: number;
  timestamp: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-[#D1FAE5] text-[#10B981]',
  update: 'bg-[#FEF3C7] text-[#F59E0B]',
  delete: 'bg-[#FEE2E2] text-[#EF4444]',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<AuditEntry[]>('/api/v1/audit', { limit: '200' }, { auth: true });
      setEntries(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar auditoría');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Auditoría</h1>
        <Button size="sm" variant="outline" className="gap-1" onClick={fetch}>
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <p className="text-[13px] text-[#EF4444]">{error}</p>
        </div>
      )}

      {!isLoading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
          <History className="h-10 w-10 text-[#45464D] mb-3" />
          <p className="text-sm font-semibold text-[#45464D]">Sin registros de auditoría</p>
          <p className="mt-1 text-xs text-[#45464D]">Las acciones aparecerán aquí a medida que uses el sistema</p>
        </div>
      )}

      {!isLoading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="bg-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={ACTION_COLORS[entry.action] ?? ''}>
                        {entry.action}
                      </Badge>
                      <span className="text-[13px] font-medium text-[#1B1B1D] capitalize">{entry.resource}</span>
                      {entry.details && (
                        <span className="text-[13px] text-[#45464D]">— {entry.details}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#45464D]">
                      {new Date(entry.timestamp).toLocaleString('es-ES')}
                      {entry.resourceId && ` · ID: ${entry.resourceId.slice(0, 8)}...`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
