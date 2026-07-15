'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ItemForm } from '@/components/forms/item-form';
import { ArrowLeft, HardDrive, Package, Activity, Plus, Pencil, Trash2 } from 'lucide-react';

const ESTADO_COLORS: Record<string, string> = {
  '🟢': 'bg-[#D1FAE5] text-[#10B981]',
  '🟡': 'bg-[#FEF3C7] text-[#F59E0B]',
  '🔴': 'bg-[#FEE2E2] text-[#EF4444]',
  '⚪': 'bg-[#F0EDEF] text-[#45464D]',
};

interface ItemInventario {
  id: string;
  nombre: string;
  categoria: string;
  estado: string;
  descripcion?: string;
  fechaImplementacion?: string;
  responsable?: string;
}

interface SistemaDetail {
  id: string;
  nombreSistema: string;
  tipo: string;
  entorno?: string;
  version?: string;
  estadoTecnico: string;
  fechaUltimoChequeo?: string;
  cliente?: { id: string; nombre: string } | null;
  items: ItemInventario[];
}

export default function SistemaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sistema, setSistema] = useState<SistemaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemInventario | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await api.get<SistemaDetail>(`/api/v1/tenant/sistemas/${id}`, undefined, { auth: true });
      setSistema(data);
    } catch (err) {
      setIsError(true);
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar sistema');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [id]);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este item del inventario?')) return;
    try {
      await api.delete(`/api/v1/tenant/sistemas/items/${itemId}`, { auth: true });
      fetch();
    } catch { /* ignore */ }
  };

  const handleItemFormSuccess = () => {
    setShowItemForm(false);
    setEditingItem(null);
    fetch();
  };

  const groupByCategory = (items: ItemInventario[]) => {
    const map: Record<string, ItemInventario[]> = {};
    for (const item of items) {
      if (!map[item.categoria]) map[item.categoria] = [];
      map[item.categoria].push(item);
    }
    return map;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-[#F0EDEF]" />
        <div className="h-48 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white" />
      </div>
    );
  }

  if (isError || !sistema) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#EF4444]">Error al cargar sistema</p>
          <p className="text-xs text-[#45464D]">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={fetch} className="mt-2">Reintentar</Button>
        </div>
      </div>
    );
  }

  const categorias = groupByCategory(sistema.items);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/admin/sistemas')} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Button>

      {/* Info card */}
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="h-5 w-5 text-[#45464D]" />
                <h1 className="text-[18px] font-semibold text-[#1B1B1D]">{sistema.nombreSistema}</h1>
              </div>
              {sistema.cliente && (
                <button
                  onClick={() => router.push(`/admin/clientes/${sistema.cliente!.id}`)}
                  className="text-[13px] text-[#131B2E] underline hover:text-[#45464D]"
                >
                  {sistema.cliente.nombre}
                </button>
              )}
            </div>
            <Badge variant="outline" className={ESTADO_COLORS[sistema.estadoTecnico] ?? ''}>
              {sistema.estadoTecnico}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div><span className="text-[#45464D]">Tipo:</span> <span className="text-[#1B1B1D]">{sistema.tipo}</span></div>
            {sistema.entorno && <div><span className="text-[#45464D]">Entorno:</span> <span className="text-[#1B1B1D]">{sistema.entorno}</span></div>}
            {sistema.version && <div><span className="text-[#45464D]">Versión:</span> <span className="text-[#1B1B1D]">{sistema.version}</span></div>}
            {sistema.fechaUltimoChequeo && (
              <div><span className="text-[#45464D]">Último check:</span> <span className="text-[#1B1B1D]">{new Date(sistema.fechaUltimoChequeo).toLocaleDateString('es-ES')}</span></div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items by category */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#45464D]" />
              <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Inventario ({sistema.items.length})</h2>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowItemForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Añadir item
            </Button>
          </div>

          {sistema.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Activity className="h-8 w-8 text-[#45464D] mb-2" />
              <p className="text-[13px] text-[#45464D]">Sin items de inventario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(categorias).map(([categoria, items]) => (
                <div key={categoria}>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.05em] text-[#45464D] mb-2">{categoria}</h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-[0.25rem] border border-[#E2E8F0] bg-white p-3">
                        <div className="flex items-start justify-between">
                          <p className="text-[13px] font-medium text-[#1B1B1D]">{item.nombre}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-[#D1FAE5] text-[#10B981]">{item.estado}</Badge>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="p-0.5 text-[#45464D] hover:text-[#1B1B1D]"
                              title="Editar item"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-0.5 text-[#EF4444] hover:text-[#DC2626]"
                              title="Eliminar item"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {item.descripcion && <p className="text-[11px] text-[#45464D] mt-1">{item.descripcion}</p>}
                        <div className="flex items-center gap-3 mt-1">
                          {item.responsable && <span className="text-[11px] text-[#45464D]">{item.responsable}</span>}
                          {item.fechaImplementacion && (
                            <span className="text-[11px] text-[#45464D]">
                              {new Date(item.fechaImplementacion).toLocaleDateString('es-ES')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Create item dialog */}
      <Dialog open={showItemForm} onClose={() => setShowItemForm(false)} title="Nuevo item de inventario">
        <ItemForm
          sistemaId={sistema.id}
          onSuccess={handleItemFormSuccess}
          onCancel={() => setShowItemForm(false)}
        />
      </Dialog>

      {/* Edit item dialog */}
      <Dialog
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={editingItem ? `Editar: ${editingItem.nombre}` : 'Editar item'}
      >
        {editingItem && (
          <ItemForm
            sistemaId={sistema.id}
            initial={{
              id: editingItem.id,
              nombre: editingItem.nombre,
              categoria: editingItem.categoria,
              estado: editingItem.estado,
              descripcion: editingItem.descripcion ?? '',
              responsable: editingItem.responsable ?? '',
              fechaImplementacion: editingItem.fechaImplementacion?.split('T')[0] ?? '',
            }}
            onSuccess={handleItemFormSuccess}
            onCancel={() => setEditingItem(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
