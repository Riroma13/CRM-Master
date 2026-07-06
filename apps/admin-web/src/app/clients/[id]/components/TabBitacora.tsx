'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import type { EventoItem, PaginatedResponse } from '@/lib/api-types';
import { Calendar, ChevronDown } from 'lucide-react';

interface TabBitacoraProps {
  clienteId: string;
}

const tipoColors: Record<string, string> = {
  Decisión: 'bg-[#DAE2FD] text-[#0F172A] border-[#DAE2FD]',
  Incidencia: 'bg-[#FEE2E2] text-[#991B1B] border-[#FEE2E2]',
  Revisión: 'bg-[#D1FAE5] text-[#065F46] border-[#D1FAE5]',
  Configuración: 'bg-[#F0EDEF] text-[#45464D] border-[#F0EDEF]',
};

export function TabBitacora({ clienteId }: TabBitacoraProps) {
  const [eventos, setEventos] = useState<EventoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const fetchEventos = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const res = await api.get<PaginatedResponse<EventoItem>>(
          `/api/v1/admin/clientes/${clienteId}/eventos`,
          { page: pageNum, limit },
        );
        if (pageNum === 1) {
          setEventos(res.data);
        } else {
          setEventos((prev) => [...prev, ...res.data]);
        }
        setTotalPages(res.pagination.totalPages);
      } catch {
        // Silently fail — show what we have
      } finally {
        setLoading(false);
      }
    },
    [clienteId],
  );

  useEffect(() => {
    fetchEventos(1);
  }, [fetchEventos]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEventos(nextPage);
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Bitácora de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && eventos.length === 0 ? (
          <p className="text-sm text-[#45464D]">Cargando eventos...</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-[#45464D]">
            No hay eventos registrados para este cliente.
          </p>
        ) : (
          <div className="space-y-0">
            {eventos.map((evento, idx) => (
              <div
                key={evento.id}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                {/* Timeline connector */}
                {idx < eventos.length - 1 && (
                  <div className="absolute left-[15px] top-8 h-full w-px bg-[#E2E8F0]" />
                )}

                {/* Icon circle */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    tipoColors[evento.tipo]?.split(' ')[0] ?? 'bg-[#F0EDEF]'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-[#45464D]" />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[#1B1B1D]">
                        {evento.titulo}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`border-0 text-[10px] font-semibold uppercase ${
                            tipoColors[evento.tipo] ??
                            'bg-[#F0EDEF] text-[#45464D]'
                          }`}
                        >
                          {evento.tipo}
                        </Badge>
                        {evento.sistema && (
                          <span className="text-[11px] text-[#C6C6CD]">
                            {evento.sistema.nombreSistema}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-[11px] text-[#45464D]">
                      {new Date(evento.fecha).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {evento.descripcion && (
                    <p className="mt-1 text-[13px] text-[#45464D]">
                      {evento.descripcion}
                    </p>
                  )}

                  {evento.siguienteAccion && (
                    <div className="mt-1 flex items-start gap-1 text-[12px] text-[#0F172A]">
                      <span className="font-medium">Próximo paso:</span>
                      <span>{evento.siguienteAccion}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load more */}
            {page < totalPages && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="gap-1 text-xs"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  {loading ? 'Cargando...' : 'Cargar más'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
