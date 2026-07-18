'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@crm-master/ui';
import type { SistemaDetail } from '@/lib/api-types';

interface TabInventarioProps {
  sistemas: SistemaDetail[];
}

export function TabInventario({ sistemas }: TabInventarioProps) {
  const [filterEstado, setFilterEstado] = useState<string | null>(null);

  // Flatten all items from all systems
  const allItems = sistemas.flatMap((sys) =>
    sys.items.map((item) => ({
      ...item,
      sistemaNombre: sys.nombreSistema,
      sistemaId: sys.id,
    })),
  );

  const estados = [...new Set(allItems.map((i) => i.estado))];

  const filtered = filterEstado
    ? allItems.filter((i) => i.estado === filterEstado)
    : allItems;

  if (allItems.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#45464D]">No hay inventario registrado para este cliente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterEstado(null)}
          className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
            filterEstado === null
              ? 'bg-[#0F172A] text-white'
              : 'bg-[#F0EDEF] text-[#45464D] hover:bg-[#E2E8F0]'
          }`}
        >
          All ({allItems.length})
        </button>
        {estados.map((est) => (
          <button
            key={est}
            onClick={() => setFilterEstado(est)}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
              filterEstado === est
                ? 'bg-[#0F172A] text-white'
                : 'bg-[#F0EDEF] text-[#45464D] hover:bg-[#E2E8F0]'
            }`}
          >
            {est} ({allItems.filter((i) => i.estado === est).length})
          </button>
        ))}
      </div>

      <Card className="bg-white">
        <CardContent className="p-0">
          {filtered.map((item, i) => (
            <div
              key={`${item.sistemaId}-${item.id}`}
              className={`flex items-center gap-3 p-4 ${i < filtered.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
            >
              {item.estado === 'Implementado' || item.estado === 'Implementado' ? (
                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              ) : item.estado === 'Pendiente' || item.estado === 'En Progreso' ? (
                <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
              ) : (
                <Clock className="h-5 w-5 text-[#C6C6CD]" />
              )}
              <div className="flex-1">
                <span className="text-sm text-[#1B1B1D]">{item.nombre}</span>
                <p className="text-[11px] text-[#45464D]">{item.sistemaNombre}</p>
              </div>
              {item.responsable && (
                <span className="text-xs text-[#45464D]">{item.responsable}</span>
              )}
              <Badge
                variant={
                  item.estado === 'Implementado'
                    ? 'success'
                    : item.estado === 'Pendiente'
                      ? 'warning'
                      : 'default'
                }
                className="text-[10px]"
              >
                {item.estado}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
