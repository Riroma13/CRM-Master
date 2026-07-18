'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@crm-master/ui';
import { api } from '@/lib/api';
import type { TareaItem, PaginatedResponse } from '@/lib/api-types';

interface TabTareasProps {
  clienteId: string;
}

export function TabTareas({ clienteId }: TabTareasProps) {
  const [tareas, setTareas] = useState<TareaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get<PaginatedResponse<TareaItem>>(
      `/api/v1/admin/clientes/${clienteId}/tareas`,
      { page: 1, limit: 20 },
    )
      .then((res) => setTareas(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [clienteId]);

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#45464D]">Cargando tareas...</p>
        </CardContent>
      </Card>
    );
  }

  if (tareas.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#45464D]">No hay tareas pendientes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        {tareas.map((task, i) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-4 ${i < tareas.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                task.estado === 'Hecho'
                  ? 'border-[#10B981] bg-[#10B981]'
                  : task.estado === 'En Progreso'
                    ? 'border-[#F59E0B]'
                    : 'border-[#C6C6CD]'
              }`}
            >
              {task.estado === 'Hecho' && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <span
              className={`flex-1 text-sm ${
                task.estado === 'Hecho' ? 'text-[#45464D] line-through' : 'text-[#1B1B1D]'
              }`}
            >
              {task.titulo}
            </span>
            {task.sistema && (
              <span className="text-xs text-[#45464D]">{task.sistema.nombreSistema}</span>
            )}
            <Badge
              variant={
                task.prioridad === 'Alta' || task.prioridad === 'Urgente'
                  ? 'critical'
                  : task.prioridad === 'Media'
                    ? 'warning'
                    : 'default'
              }
              className="text-[10px]"
            >
              {task.prioridad}
            </Badge>
            {task.fechaLimite && (
              <span className="text-xs text-[#45464D]">
                {new Date(task.fechaLimite).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
