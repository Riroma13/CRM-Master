'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useIncidencias, IncidenciaItem } from '@/hooks/use-incidencias';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { AlertTriangle, Plus, Save, Trash2 } from 'lucide-react';

const ESTADO_COLORS: Record<string, string> = {
  abierta: 'bg-[#FEE2E2] text-[#EF4444]',
  en_curso: 'bg-[#FEF3C7] text-[#F59E0B]',
  resuelta: 'bg-[#D1FAE5] text-[#10B981]',
  cerrada: 'bg-[#F0EDEF] text-[#45464D]',
};

const PRIORIDAD_COLORS: Record<string, string> = {
  critica: 'bg-[#DC2626] text-white',
  alta: 'bg-[#EF4444] text-white',
  media: 'bg-[#F59E0B] text-white',
  baja: 'bg-[#10B981] text-white',
};

const ESTADOS = ['abierta', 'en_curso', 'resuelta', 'cerrada'];
const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];

const ESTADO_LABELS: Record<string, string> = { abierta: 'Abierta', en_curso: 'En curso', resuelta: 'Resuelta', cerrada: 'Cerrada' };
const PRIORIDAD_LABELS: Record<string, string> = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' };

interface ClienteOption { id: string; nombre: string; }

export default function IncidenciasPage() {
  const { toast } = useToast();
  const { incidencias, isLoading, isError, error, refetch } = useIncidencias();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<IncidenciaItem | null>(null);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [prioridadFilter, setPrioridadFilter] = useState('');

  // Form fields
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('media');
  const [estado, setEstado] = useState('abierta');
  const [clienteId, setClienteId] = useState('');
  const [asignadoA, setAsignadoA] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ClienteOption[]>('/api/v1/tenant/clientes', undefined, { auth: true })
      .then(setClientes).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null); setTitulo(''); setDescripcion(''); setPrioridad('media'); setEstado('abierta');
    setClienteId(''); setAsignadoA(''); setFechaLimite(''); setFormError(null); setShowForm(true);
  };

  const openEdit = (inc: IncidenciaItem) => {
    setEditing(inc); setTitulo(inc.titulo); setDescripcion(inc.descripcion ?? ''); setPrioridad(inc.prioridad);
    setEstado(inc.estado); setClienteId(inc.cliente?.id ?? ''); setAsignadoA(inc.asignadoA ?? '');
    setFechaLimite(inc.fechaLimite?.split('T')[0] ?? ''); setFormError(null); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true); setFormError(null);
    try {
      const body = { titulo: titulo.trim(), descripcion: descripcion.trim() || undefined, prioridad, estado, clienteId: clienteId || undefined, asignadoA: asignadoA.trim() || undefined, fechaLimite: fechaLimite || undefined };
      if (editing) {
        await api.patch(`/api/v1/tenant/incidencias/${editing.id}`, body, { auth: true });
        toast('success', 'Incidencia actualizada');
      } else {
        await api.post('/api/v1/tenant/incidencias', body, { auth: true });
        toast('success', 'Incidencia creada');
      }
      setShowForm(false); refetch();
    } catch (err: any) { setFormError(err?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Cerrar esta incidencia?')) return;
    try { await api.delete(`/api/v1/tenant/incidencias/${id}`, { auth: true }); toast('success', 'Incidencia cerrada'); refetch(); }
    catch { toast('error', 'Error al cerrar'); }
  };

  const filtered = incidencias.filter((i) => {
    if (estadoFilter && i.estado !== estadoFilter) return false;
    if (prioridadFilter && i.prioridad !== prioridadFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Incidencias</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Incidencias</h1>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#EF4444]">Error al cargar incidencias</p>
          <p className="text-xs text-[#45464D]">{error?.message}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-2">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Incidencias</h1>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Nueva incidencia
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}
          className="rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
        </select>
        <select value={prioridadFilter} onChange={(e) => setPrioridadFilter(e.target.value)}
          className="rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>)}
        </select>
        <span className="text-[13px] text-[#45464D]">{filtered.length} de {incidencias.length}</span>
      </div>

      {/* Empty */}
      {incidencias.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
          <AlertTriangle className="h-10 w-10 text-[#45464D] mb-3" />
          <p className="text-sm font-semibold text-[#45464D]">Sin incidencias</p>
          <p className="mt-1 text-xs text-[#45464D]">Crea la primera incidencia para empezar el seguimiento</p>
        </div>
      )}

      {/* Filtered empty */}
      {incidencias.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border border-[#E2E8F0] bg-white p-12">
          <p className="text-sm text-[#45464D]">No hay incidencias con los filtros seleccionados</p>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((inc) => (
            <Card key={inc.id} className="bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(inc)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{inc.titulo}</h3>
                      <Badge variant="outline" className={PRIORIDAD_COLORS[inc.prioridad] ?? ''}>{PRIORIDAD_LABELS[inc.prioridad] ?? inc.prioridad}</Badge>
                    </div>
                    {inc.cliente && <p className="text-[13px] text-[#45464D]">{inc.cliente.nombre}</p>}
                  </div>
                  <Badge variant="outline" className={ESTADO_COLORS[inc.estado] ?? ''}>{ESTADO_LABELS[inc.estado] ?? inc.estado}</Badge>
                </div>
                {inc.descripcion && <p className="text-[13px] text-[#45464D] mb-2 line-clamp-2">{inc.descripcion}</p>}
                <div className="flex items-center gap-3 text-[11px] text-[#45464D] border-t border-[#E2E8F0] pt-2">
                  <span>{new Date(inc.createdAt).toLocaleDateString('es-ES')}</span>
                  {inc.asignadoA && <span>Asignado: {inc.asignadoA}</span>}
                  {inc.fechaLimite && <span>Límite: {new Date(inc.fechaLimite).toLocaleDateString('es-ES')}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar incidencia' : 'Nueva incidencia'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <div className="rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3"><p className="text-[13px] text-[#EF4444]">{formError}</p></div>}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Título *</label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Problema con facturación" className="mt-1" required />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles..." rows={3} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Cliente</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
                <option value="">Sin cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Prioridad</label>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
                {PRIORIDADES.map((p) => <option key={p} value={p}>{PRIORIDAD_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {editing && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Estado</label>
                <select value={estado} onChange={(e) => setEstado(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
                  {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Asignado a</label>
              <Input value={asignadoA} onChange={(e) => setAsignadoA(e.target.value)} placeholder="Nombre de la persona" className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Fecha límite</label>
            <input type="date" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]" />
          </div>
          <div className="flex items-center justify-between pt-2">
            {editing && <Button type="button" variant="outline" size="sm" className="text-[#EF4444]" onClick={() => { setShowForm(false); handleDelete(editing.id); }}><Trash2 className="h-3.5 w-3.5" /> Cerrar</Button>}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" disabled={saving || !titulo.trim()}>
                <Save className="h-3.5 w-3.5" /> {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear incidencia'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
