'use client';

import { useState } from 'react';
import { useTareas, TareaItem } from '@/hooks/use-tareas';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { TareaForm } from '@/components/forms/tarea-form';
import { Plus, ClipboardList } from 'lucide-react';

const COLUMNAS = ['Pendiente', 'En curso', 'Hecho', 'Cancelada'] as const;

const PRIORIDAD_COLORS: Record<string, string> = {
  Alta: 'bg-[#FEE2E2] text-[#EF4444]',
  Media: 'bg-[#FEF3C7] text-[#F59E0B]',
  Baja: 'bg-[#D1FAE5] text-[#10B981]',
};

function TareaCard({ tarea, onEdit, onAvanzar, onRetroceder }: {
  tarea: TareaItem;
  onEdit: () => void;
  onAvanzar?: () => void;
  onRetroceder?: () => void;
}) {
  return (
    <Card className="bg-white mb-2 cursor-pointer hover:shadow-md transition-shadow" onClick={onEdit}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-1">
          <p className="text-[13px] font-medium text-[#1B1B1D]">{tarea.titulo}</p>
          <Badge variant="outline" className={PRIORIDAD_COLORS[tarea.prioridad] ?? ''}>
            {tarea.prioridad}
          </Badge>
        </div>
        {tarea.cliente && (
          <p className="text-[11px] text-[#45464D] mb-1">{tarea.cliente.nombre}</p>
        )}
        {tarea.fechaLimite && (
          <p className="text-[11px] text-[#45464D]">
            {new Date(tarea.fechaLimite).toLocaleDateString('es-ES')}
          </p>
        )}
        <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          {onRetroceder && (
            <button onClick={onRetroceder} className="text-[11px] text-[#45464D] hover:text-[#1B1B1D] px-1">←</button>
          )}
          {onAvanzar && (
            <button onClick={onAvanzar} className="text-[11px] text-[#45464D] hover:text-[#1B1B1D] px-1">→</button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TareasPage() {
  const { toast } = useToast();
  const { tareas, isLoading, isError, error, refetch, updateTarea, deleteTarea } = useTareas();
  const [showForm, setShowForm] = useState(false);
  const [editingTarea, setEditingTarea] = useState<TareaItem | null>(null);

  const avanzarEstado = (tarea: TareaItem) => {
    const idx = COLUMNAS.indexOf(tarea.estado as any);
    if (idx < COLUMNAS.length - 1) {
      updateTarea(tarea.id, { estado: COLUMNAS[idx + 1] });
    }
  };

  const retrocederEstado = (tarea: TareaItem) => {
    const idx = COLUMNAS.indexOf(tarea.estado as any);
    if (idx > 0) {
      updateTarea(tarea.id, { estado: COLUMNAS[idx - 1] });
    }
  };

  const handleEdit = (tarea: TareaItem) => {
    setEditingTarea(tarea);
  };

  const handleFormSuccess = (action: 'creada' | 'actualizada' | 'eliminada' = 'actualizada') => {
    setShowForm(false);
    setEditingTarea(null);
    refetch();
    toast('success', `Tarea ${action} correctamente`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Tareas</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNAS.map((col) => (
            <div key={col} className="space-y-2">
              <div className="h-8 w-24 animate-pulse rounded bg-[#F0EDEF]" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-3" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Tareas</h1>
        </div>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#EF4444]">Error al cargar tareas</p>
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
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Tareas</h1>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nueva tarea
        </Button>
      </div>

      {tareas.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
          <ClipboardList className="h-10 w-10 text-[#45464D] mb-3" />
          <p className="text-sm font-semibold text-[#45464D]">No hay tareas</p>
          <p className="mt-1 text-xs text-[#45464D]">Crea tu primera tarea para empezar</p>
        </div>
      )}

      {tareas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNAS.map((col) => (
            <div key={col}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-[#131B2E]" />
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">{col}</h2>
                <span className="text-[11px] text-[#45464D]">({tareas.filter(t => t.estado === col).length})</span>
              </div>
              <div className="space-y-1 min-h-[200px] rounded-[0.5rem] bg-[#F8FAFC] p-2">
                {tareas
                  .filter(t => t.estado === col)
                  .map(tarea => (
                    <TareaCard
                      key={tarea.id}
                      tarea={tarea}
                      onEdit={() => handleEdit(tarea)}
                      onAvanzar={col !== 'Hecho' && col !== 'Cancelada' ? () => avanzarEstado(tarea) : undefined}
                      onRetroceder={col !== 'Pendiente' ? () => retrocederEstado(tarea) : undefined}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nueva tarea">
        <TareaForm onSuccess={() => handleFormSuccess('creada')} onCancel={() => setShowForm(false)} />
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editingTarea}
        onClose={() => setEditingTarea(null)}
        title={editingTarea ? `Editar: ${editingTarea.titulo}` : 'Editar tarea'}
      >
        {editingTarea && (
          <TareaForm
            initial={{
              id: editingTarea.id,
              titulo: editingTarea.titulo,
              descripcion: (editingTarea as any).descripcion ?? '',
              prioridad: editingTarea.prioridad,
              estado: editingTarea.estado,
              clienteId: editingTarea.cliente?.id ?? '',
              fechaLimite: editingTarea.fechaLimite?.split('T')[0] ?? '',
            }}
            onSuccess={handleFormSuccess}
            onCancel={() => setEditingTarea(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
