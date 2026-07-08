'use client';

import { useRouter } from 'next/navigation';
import { useSistemas } from '@/hooks/use-sistemas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HardDrive, Activity, Plus } from 'lucide-react';

const ESTADO_COLORS: Record<string, string> = {
  '🟢': 'bg-[#D1FAE5] text-[#10B981]',
  '🟡': 'bg-[#FEF3C7] text-[#F59E0B]',
  '🔴': 'bg-[#FEE2E2] text-[#EF4444]',
  '⚪': 'bg-[#F0EDEF] text-[#45464D]',
};

export default function SistemasPage() {
  const router = useRouter();
  const { sistemas, isLoading, isError, error, refetch } = useSistemas();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Sistemas</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Sistemas</h1>
        </div>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#EF4444]">Error al cargar sistemas</p>
              <p className="text-xs text-[#45464D]">{error?.message || 'Error desconocido'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Sistemas</h1>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white">
          <Plus className="h-3.5 w-3.5" />
          Nuevo sistema
        </Button>
      </div>

      {sistemas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
          <HardDrive className="h-10 w-10 text-[#45464D] mb-3" />
          <p className="text-sm font-semibold text-[#45464D]">No hay sistemas registrados</p>
          <p className="mt-1 text-xs text-[#45464D]">Los sistemas aparecerán aquí cuando asocies clientes con sistemas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sistemas.map((s) => (
            <Card
              key={s.id}
              className="bg-white transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => router.push(`/admin/sistemas/${s.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{s.nombreSistema}</h3>
                  <Badge variant="outline" className={ESTADO_COLORS[s.estadoTecnico] ?? ''}>
                    {s.estadoTecnico}
                  </Badge>
                </div>
                <p className="text-[13px] text-[#45464D]">{s.tipo}</p>
                {s.cliente && (
                  <p className="text-[11px] text-[#45464D] mt-1">{s.cliente.nombre}</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-[#45464D] mt-2 border-t border-[#E2E8F0] pt-2">
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {s._count?.items ?? 0} items</span>
                  {s.entorno && <span>{s.entorno}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
