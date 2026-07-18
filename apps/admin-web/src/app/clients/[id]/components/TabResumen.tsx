'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@crm-master/ui';
import { Progress } from '@/components/ui/progress';
import type { ClienteDetail } from '@/lib/api-types';

interface TabResumenProps {
  client: ClienteDetail;
}

export function TabResumen({ client }: TabResumenProps) {
  const sistemasCount = client.sistemas.length;
  const itemsCount = client.sistemas.reduce((acc, s) => acc + s.items.length, 0);
  const healthValue = client.saludGeneral === '🟢' ? 95 : client.saludGeneral === '🟡' ? 65 : 35;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Overview */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Resumen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {client.notasGenerales ? (
            <p className="text-[#45464D]">{client.notasGenerales}</p>
          ) : (
            <p className="text-[#C6C6CD] italic">Sin notas</p>
          )}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center">
              <p className="text-lg font-bold text-[#1B1B1D]">{sistemasCount}</p>
              <p className="text-[10px] uppercase tracking-[0.05em] text-[#45464D]">Sistemas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#1B1B1D]">{itemsCount}</p>
              <p className="text-[10px] uppercase tracking-[0.05em] text-[#45464D]">Items</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#1B1B1D]">{client.tags.length}</p>
              <p className="text-[10px] uppercase tracking-[0.05em] text-[#45464D]">Tags</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health / SLA */}
      <Card className="border-l-4 border-l-[#10B981] bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Salud General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#45464D]">Indicador</span>
            <span className="font-semibold text-[#1B1B1D]">{client.saludGeneral}</span>
          </div>
          <Progress value={healthValue} indicatorClass="bg-[#10B981]" className="h-1.5" />
          <div className="flex items-center justify-between">
            <span className="text-[#45464D]">Relación</span>
            <span className="font-semibold text-[#1B1B1D]">{client.estadoRelacion}</span>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#45464D]">Desde</span>
            <span className="font-semibold text-[#1B1B1D]">
              {client.fechaInicio
                ? new Date(client.fechaInicio).toLocaleDateString()
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#45464D]">Creado</span>
            <span className="font-semibold text-[#1B1B1D]">
              {new Date(client.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
