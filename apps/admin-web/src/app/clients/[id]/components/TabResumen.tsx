'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { ClienteDetail, EventoItem } from '@/lib/api-types';
import { Server, Package, ClipboardList } from 'lucide-react';

interface TabResumenProps {
  cliente: ClienteDetail;
}

export function TabResumen({ cliente }: TabResumenProps) {
  const [ultimosEventos, setUltimosEventos] = useState<EventoItem[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(true);

  useEffect(() => {
    api
      .get<{ data: EventoItem[] }>(
        `/api/v1/admin/clientes/${cliente.id}/eventos`,
        { limit: 3 },
      )
      .then((res) => setUltimosEventos(res.data))
      .catch(() => setUltimosEventos([]))
      .finally(() => setLoadingEventos(false));
  }, [cliente.id]);

  const sistemasCount = cliente.sistemas.length;
  const inventarioCount = cliente.sistemas.reduce(
    (acc, sys) => acc + sys.items.length,
    0,
  );

  // Count pending tasks would require a separate fetch — for now a placeholder
  const indicadores = [
    { label: 'Sistemas', value: sistemasCount, icon: Server, color: 'text-[#0F172A] bg-[#DAE2FD]' },
    { label: 'Items Inventario', value: inventarioCount, icon: Package, color: 'text-[#065F46] bg-[#D1FAE5]' },
    { label: 'Tareas Pendientes', value: '—', icon: ClipboardList, color: 'text-[#92400E] bg-[#FEF3C7]' },
  ];

  return (
    <div className="space-y-4">
      {/* Indicadores rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {indicadores.map((ind) => {
          const Icon = ind.icon;
          return (
            <Card key={ind.label} className="bg-white">
              <CardContent className="flex items-start gap-3 p-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${ind.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                    {ind.label}
                  </p>
                  <p className="text-[30px] font-bold leading-none tracking-tight text-[#1B1B1D]">
                    {ind.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notas generales */}
      {cliente.notasGenerales && (
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Notas Generales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-[#1B1B1D]">
              {cliente.notasGenerales}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Últimos eventos */}
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Últimos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEventos ? (
            <p className="text-sm text-[#45464D]">Cargando eventos...</p>
          ) : ultimosEventos.length === 0 ? (
            <p className="text-sm text-[#45464D]">Sin eventos recientes.</p>
          ) : (
            <div className="space-y-3">
              {ultimosEventos.map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-start gap-3 border-b border-[#E2E8F0] pb-3 last:border-0 last:pb-0"
                >
                  <TipoBadge tipo={evento.tipo} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium text-[#1B1B1D]">
                        {evento.titulo}
                      </p>
                      <span className="shrink-0 text-[11px] text-[#45464D]">
                        {new Date(evento.fecha).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    {evento.descripcion && (
                      <p className="text-[12px] text-[#45464D]">
                        {evento.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const colorMap: Record<string, string> = {
    Decisión: 'bg-[#DAE2FD] text-[#0F172A]',
    Incidencia: 'bg-[#FEE2E2] text-[#991B1B]',
    Revisión: 'bg-[#D1FAE5] text-[#065F46]',
    Configuración: 'bg-[#F0EDEF] text-[#45464D]',
  };

  return (
    <Badge
      variant="outline"
      className={`shrink-0 border-0 text-[10px] font-semibold uppercase ${
        colorMap[tipo] ?? 'bg-[#F0EDEF] text-[#45464D]'
      }`}
    >
      {tipo}
    </Badge>
  );
}
