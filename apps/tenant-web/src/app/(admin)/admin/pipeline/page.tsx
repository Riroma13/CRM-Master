'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { TrendingUp, ArrowRight, Users } from 'lucide-react';

interface PipelineClient {
  id: string;
  nombre: string;
  tipoNegocio?: string;
  saludGeneral: string;
  tags: string[];
  createdAt: string;
}

const STAGES = [
  { key: 'Prospecto', label: 'Prospecto', color: 'bg-[#DAE2FD] text-[#131B2E]' },
  { key: 'Activo', label: 'Activo', color: 'bg-[#D1FAE5] text-[#10B981]' },
  { key: 'En pausa', label: 'En pausa', color: 'bg-[#FEF3C7] text-[#F59E0B]' },
  { key: 'Cerrado', label: 'Cerrado', color: 'bg-[#F0EDEF] text-[#45464D]' },
];

const STAGE_ORDER = ['Prospecto', 'Activo', 'En pausa', 'Cerrado'];

export default function PipelinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clients, setClients] = useState<PipelineClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any[]>('/api/v1/tenant/clientes', undefined, { auth: true });
      setClients(data);
    } catch { /* ignore */ } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const moveTo = async (clientId: string, newState: string) => {
    try {
      await api.patch(`/api/v1/tenant/clientes/${clientId}`, { estadoRelacion: newState }, { auth: true });
      toast('success', `Movido a ${newState}`);
      fetch();
    } catch { toast('error', 'Error al mover'); }
  };

  const grouped = STAGES.map((s) => ({
    ...s,
    clients: clients.filter((c) => (c as any).estadoRelacion === s.key),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Pipeline comercial</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => (
            <div key={s.key} className="h-64 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Pipeline comercial</h1>
        <Button size="sm" variant="outline" className="gap-1" onClick={fetch}>
          <TrendingUp className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {grouped.map((stage) => (
          <div key={stage.key}>
            <div className={`flex items-center justify-between rounded-t-[0.5rem] ${stage.color} px-3 py-2`}>
              <span className="text-[13px] font-semibold">{stage.label}</span>
              <span className="text-[13px] font-semibold">{stage.clients.length}</span>
            </div>
            <div className="space-y-2 rounded-b-[0.5rem] border border-t-0 border-[#E2E8F0] bg-[#F8FAFC] p-2 min-h-[200px]">
              {stage.clients.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-[#45464D]">Sin clientes</p>
              ) : (
                stage.clients.map((c) => (
                  <Card key={c.id} className="bg-white cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3" onClick={() => router.push(`/admin/clientes/${c.id}`)}>
                      <p className="text-[13px] font-medium text-[#1B1B1D]">{c.nombre}</p>
                      {c.tipoNegocio && <p className="text-[11px] text-[#45464D]">{c.tipoNegocio}</p>}
                      {c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tags.map((t) => <Badge key={t} variant="default" className="text-[9px]">{t}</Badge>)}
                        </div>
                      )}
                      {/* Move buttons */}
                      <div className="flex gap-1 mt-2 border-t border-[#E2E8F0] pt-2">
                        {STAGE_ORDER.indexOf(stage.key) > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); moveTo(c.id, STAGE_ORDER[STAGE_ORDER.indexOf(stage.key) - 1]); }}
                            className="text-[11px] text-[#45464D] hover:text-[#1B1B1D] px-1">←</button>
                        )}
                        {STAGE_ORDER.indexOf(stage.key) < STAGE_ORDER.length - 1 && (
                          <button onClick={(e) => { e.stopPropagation(); moveTo(c.id, STAGE_ORDER[STAGE_ORDER.indexOf(stage.key) + 1]); }}
                            className="text-[11px] text-[#45464D] hover:text-[#1B1B1D] px-1">→</button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
