'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import type { ClienteDetail } from '@/lib/api-types';

interface TabInventarioProps {
  cliente: ClienteDetail;
}

const estados = ['Todos', 'Implementado', 'Parcial', 'Planeado', 'Obsoleto'];

const iconMap: Record<string, typeof CheckCircle2> = {
  Implementado: CheckCircle2,
  Parcial: AlertTriangle,
  Planeado: Clock,
  Obsoleto: HelpCircle,
};

const colorMap: Record<string, string> = {
  Implementado: 'text-[#10B981]',
  Parcial: 'text-[#F59E0B]',
  Planeado: 'text-[#C6C6CD]',
  Obsoleto: 'text-[#45464D]',
};

const badgeVariantMap: Record<string, 'success' | 'warning' | 'default' | 'outline'> = {
  Implementado: 'success',
  Parcial: 'warning',
  Planeado: 'default',
  Obsoleto: 'outline',
};

export function TabInventario({ cliente }: TabInventarioProps) {
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Flatten all items across sistemas, attach category info
  const allItems = useMemo(() => {
    const items: Array<{
      id: string;
      nombre: string;
      categoria: string;
      estado: string;
      responsable: string | null;
      sistemaNombre: string;
    }> = [];

    for (const sistema of cliente.sistemas) {
      for (const item of sistema.items) {
        items.push({
          id: item.id,
          nombre: item.nombre,
          categoria: item.categoria,
          estado: item.estado,
          responsable: item.responsable,
          sistemaNombre: sistema.nombreSistema,
        });
      }
    }

    return items;
  }, [cliente.sistemas]);

  // Group by categoria
  const grouped = useMemo(() => {
    const filtered =
      filtroEstado === 'Todos'
        ? allItems
        : allItems.filter((item) => item.estado === filtroEstado);

    const groups: Record<string, typeof filtered> = {};
    for (const item of filtered) {
      if (!groups[item.categoria]) {
        groups[item.categoria] = [];
      }
      groups[item.categoria].push(item);
    }
    return groups;
  }, [allItems, filtroEstado]);

  if (allItems.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-[#45464D]">
            Este cliente no tiene inventario registrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Filtrar por estado:
        </Label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="h-8 rounded-[0.25rem] border border-[#E2E8F0] bg-white px-2 text-xs text-[#1B1B1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]/20"
        >
          {estados.map((est) => (
            <option key={est} value={est}>
              {est}
            </option>
          ))}
        </select>
      </div>

      {/* Grouped items */}
      {Object.entries(grouped).map(([categoria, items]) => (
        <Card key={categoria} className="bg-white">
          <CardContent className="p-0">
            <div className="border-b border-[#E2E8F0] px-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                {categoria}
              </span>
              <span className="ml-2 text-[11px] text-[#C6C6CD]">
                ({items.length})
              </span>
            </div>
            {items.map((item, idx) => {
              const Icon = iconMap[item.estado] ?? HelpCircle;
              const iconColor = colorMap[item.estado] ?? 'text-[#45464D]';

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx < items.length - 1 ? 'border-b border-[#E2E8F0]' : ''
                  }`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                  <div className="flex-1">
                    <p className="text-sm text-[#1B1B1D]">{item.nombre}</p>
                    <p className="text-[11px] text-[#C6C6CD]">
                      {item.sistemaNombre}
                      {item.responsable && ` · ${item.responsable}`}
                    </p>
                  </div>
                  <Badge
                    variant={badgeVariantMap[item.estado] ?? 'default'}
                    className="text-[10px]"
                  >
                    {item.estado}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
