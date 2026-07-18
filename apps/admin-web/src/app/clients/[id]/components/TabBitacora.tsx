'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@crm-master/ui';
import { api } from '@/lib/api';
import type { EventoItem, PaginatedResponse } from '@/lib/api-types';

interface TabBitacoraProps {
  clienteId: string;
}

const ICON_MAP: Record<string, typeof Activity> = {
  CheckCircle2,
  AlertTriangle,
  Activity,
};

function pickIcon(tipo: string): typeof Activity {
  const lower = tipo.toLowerCase();
  if (lower.includes('error') || lower.includes('alerta') || lower.includes('critico')) return AlertTriangle;
  if (lower.includes('exito') || lower.includes('complet') || lower.includes('ok')) return CheckCircle2;
  return Activity;
}

export function TabBitacora({ clienteId }: TabBitacoraProps) {
  const [eventos, setEventos] = useState<EventoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    api.get<PaginatedResponse<EventoItem>>(
      `/api/v1/admin/clientes/${clienteId}/eventos`,
      { page, limit: 10 },
    )
      .then((res) => {
        setEventos(res.data);
        setTotalPages(res.pagination.totalPages);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [clienteId, page]);

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#45464D]">Cargando eventos...</p>
        </CardContent>
      </Card>
    );
  }

  if (eventos.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#45464D]">No hay eventos registrados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Bitácora
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {eventos.map((event, i) => {
          const Icon = pickIcon(event.tipo);
          return (
            <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < eventos.length - 1 && (
                <div className="absolute left-[18px] top-10 h-full w-px bg-[#E2E8F0]" />
              )}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EDEF]">
                <Icon className="h-4 w-4 text-[#45464D]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#1B1B1D]">{event.titulo}</p>
                  <span className="text-xs text-[#45464D]">
                    {new Date(event.fecha).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-[#45464D]">
                  {event.sistema.nombreSistema} · {event.tipo}
                </p>
                {event.descripcion && (
                  <p className="text-sm text-[#45464D] mt-1">{event.descripcion}</p>
                )}
                {event.siguienteAccion && (
                  <p className="text-xs font-medium text-[#F59E0B] mt-1">
                    Siguiente: {event.siguienteAccion}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-xs text-[#45464D]">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
