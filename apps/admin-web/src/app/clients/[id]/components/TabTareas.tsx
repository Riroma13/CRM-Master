'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, CheckCircle2, Circle } from 'lucide-react';
import { api } from '@/lib/api';
import type { TareaItem, PaginatedResponse } from '@/lib/api-types';
import { EventoForm } from './EventoForm';

interface TabTareasProps {
  clienteId: string;
}

const filterEstados = ['Todas', 'Pendiente', 'En curso', 'Hecho'];

const prioridadBadge: Record<string, 'critical' | 'warning' | 'default'> = {
  Alta: 'critical',
  Media: 'warning',
  Baja: 'default',
};

export function TabTareas({ clienteId }: TabTareasProps) {
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [showForm, setShowForm] = useState(false);

  const fetchTareas = (estado?: string) => {
    setLoading(true);
    const params: Record<string, string | number> = {};
    if (estado && estado !== 'Todas') {
      params.estado = estado;
    }

    api
      .get<PaginatedResponse<TareaItem>>(
        `/api/v1/admin/clientes/${clienteId}/tareas`,
        params,
      )
      .then((res) => setTareas(res.data))
      .catch(() => setTareas([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTareas(filtroEstado);
  }, [clienteId, filtroEstado]);

  const handleEventoCreado = () => {
    setShowForm(false);
    fetchTareas(filtroEstado);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Estado:
          </Label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="h-8 rounded-[0.25rem] border border-[#E2E8F0] bg-white px-2 text-xs text-[#1B1B1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20"
          >
            {filterEstados.map((est) => (
              <option key={est} value={est}>
                {est}
              </option>
            ))}
          </select>
        </div>

        <Button
          size="sm"
          className="gap-1.5 bg-[#0F172A] text-xs text-white"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo Evento
        </Button>
      </div>

      {/* Tasks list */}
      <Card className="bg-white">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">
              <p className="text-sm text-[#45464D]">Cargando tareas...</p>
            </div>
          ) : tareas.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-[#45464D]">
                No hay tareas con este filtro.
              </p>
            </div>
          ) : (
            tareas.map((tarea, idx) => (
              <div
                key={tarea.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  idx < tareas.length - 1 ? 'border-b border-[#E2E8F0]' : ''
                }`}
              >
                {/* Status icon */}
                {tarea.estado === 'Hecho' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#10B981]" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-[#C6C6CD]" />
                )}

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        tarea.estado === 'Hecho'
                          ? 'text-[#45464D] line-through'
                          : 'text-[#1B1B1D]'
                      }`}
                    >
                      {tarea.titulo}
                    </span>
                    <Badge
                      variant={prioridadBadge[tarea.prioridad] ?? 'default'}
                      className="text-[10px]"
                    >
                      {tarea.prioridad}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#C6C6CD]">
                    {tarea.sistema && (
                      <span>{tarea.sistema.nombreSistema}</span>
                    )}
                    {tarea.fechaLimite && (
                      <>
                        <span>·</span>
                        <span>
                          Vence:{' '}
                          {new Date(tarea.fechaLimite).toLocaleDateString(
                            'es-AR',
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Evento form modal */}
      {showForm && (
        <EventoForm
          clienteId={clienteId}
          onClose={() => setShowForm(false)}
          onSuccess={handleEventoCreado}
        />
      )}
    </div>
  );
}
