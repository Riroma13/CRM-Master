'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useRecursos, ResourceItem } from '@/hooks/use-recursos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Users, Briefcase, Wrench, Plus, Save } from 'lucide-react';

const TIPO_ICONS: Record<string, React.ElementType> = {
  professional: Users,
  space: Briefcase,
  equipment: Wrench,
};

const TIPO_LABELS: Record<string, string> = {
  professional: 'Profesional',
  space: 'Espacio',
  equipment: 'Equipo',
};

const TIPOS = ['professional', 'space', 'equipment'];

export default function RecursosPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { recursos, isLoading, isError, error, refetch } = useRecursos();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('professional');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setNombre('');
    setTipo('professional');
    setDescripcion('');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (r: ResourceItem) => {
    setEditing(r);
    setNombre(r.nombre);
    setTipo(r.tipo);
    setDescripcion(r.descripcion ?? '');
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/api/v1/tenant/recursos/${editing.id}`, { nombre: nombre.trim(), tipo, descripcion: descripcion.trim() || undefined }, { auth: true });
        toast('success', 'Recurso actualizado');
      } else {
        await api.post('/api/v1/tenant/recursos', { nombre: nombre.trim(), tipo, descripcion: descripcion.trim() || undefined }, { auth: true });
        toast('success', 'Recurso creado');
      }
      setShowForm(false);
      refetch();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este recurso?')) return;
    try {
      await api.delete(`/api/v1/tenant/recursos/${id}`, { auth: true });
      toast('success', 'Recurso desactivado');
      refetch();
    } catch { toast('error', 'Error al desactivar'); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Recursos</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Recursos</h1>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#EF4444]">Error al cargar recursos</p>
          <p className="text-xs text-[#45464D]">{error?.message}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-2">Reintentar</Button>
        </div>
      </div>
    );
  }

  const getIcon = (t: string) => {
    const Icon = TIPO_ICONS[t] ?? Users;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Recursos</h1>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Nuevo recurso
        </Button>
      </div>

      {recursos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
          <Users className="h-10 w-10 text-[#45464D] mb-3" />
          <p className="text-sm font-semibold text-[#45464D]">Sin recursos</p>
          <p className="mt-1 text-xs text-[#45464D]">Crea profesionales, espacios o equipos reservables</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map((r) => (
            <Card key={r.id} className="bg-white transition-shadow hover:shadow-md cursor-pointer" onClick={() => openEdit(r)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[0.375rem] bg-[#F0EDEF]">
                      {getIcon(r.tipo)}
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{r.nombre}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{TIPO_LABELS[r.tipo] ?? r.tipo}</Badge>
                </div>
                {r.descripcion && <p className="text-[13px] text-[#45464D] mb-2">{r.descripcion}</p>}
                <div className="flex items-center gap-3 text-[11px] text-[#45464D] border-t border-[#E2E8F0] pt-2">
                  <span>{r._count?.citas ?? 0} citas</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar recurso' : 'Nuevo recurso'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3">
              <p className="text-[13px] text-[#EF4444]">{formError}</p>
            </div>
          )}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre *</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez, Sala A..." className="mt-1" required />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
              {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles del recurso..." rows={2} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none" />
          </div>
          <div className="flex items-center justify-between pt-2">
            {editing && (
              <Button type="button" variant="outline" size="sm" className="text-[#EF4444]" onClick={() => { setShowForm(false); handleDelete(editing.id); }}>Desactivar</Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" disabled={saving || !nombre.trim()}>
                <Save className="h-3.5 w-3.5" /> {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear recurso'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
