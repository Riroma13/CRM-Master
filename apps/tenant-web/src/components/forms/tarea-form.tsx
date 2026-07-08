'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Trash2 } from 'lucide-react';

interface ClienteOption {
  id: string;
  nombre: string;
}

interface TareaFormProps {
  /** Si tiene id, es edición */
  initial?: {
    id?: string;
    titulo: string;
    descripcion: string;
    prioridad: string;
    estado: string;
    clienteId: string;
    fechaLimite: string;
  };
  /** Pre-seleccionar cliente (cuando se crea desde detalle) */
  clienteId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PRIORIDADES = ['Baja', 'Media', 'Alta'];

export function TareaForm({ initial, clienteId: preselectedClienteId, onSuccess, onCancel }: TareaFormProps) {
  const isEdit = !!initial?.id;
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [titulo, setTitulo] = useState(initial?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '');
  const [prioridad, setPrioridad] = useState(initial?.prioridad ?? 'Media');
  const [estado, setEstado] = useState(initial?.estado ?? 'Pendiente');
  const [clienteId, setClienteId] = useState(initial?.clienteId ?? preselectedClienteId ?? '');
  const [fechaLimite, setFechaLimite] = useState(initial?.fechaLimite ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    api.get<ClienteOption[]>('/api/v1/tenant/clientes', undefined, { auth: true })
      .then(setClientes)
      .catch(() => {})
      .finally(() => setLoadingClientes(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      titulo: titulo.trim(),
      prioridad,
    };
    if (descripcion.trim()) body.descripcion = descripcion.trim();
    if (clienteId) body.clienteId = clienteId;
    if (fechaLimite) body.fechaLimite = fechaLimite;
    if (isEdit) body.estado = estado;

    try {
      if (isEdit && initial?.id) {
        await api.patch(`/api/v1/tenant/tareas/${initial.id}`, body, { auth: true });
      } else {
        await api.post('/api/v1/tenant/tareas', body, { auth: true });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial?.id || !confirm('¿Eliminar esta tarea?')) return;
    try {
      await api.delete(`/api/v1/tenant/tareas/${initial.id}`, { auth: true });
      onSuccess();
    } catch { /* ignore */ }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3">
          <p className="text-[13px] text-[#EF4444]">{error}</p>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Título *
        </label>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: Revisar declaración trimestral"
          className="mt-1"
          required
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Descripción
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Detalles de la tarea..."
          rows={3}
          className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Cliente
          </label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            <option value="">Sin cliente</option>
            {loadingClientes
              ? <option disabled>Cargando...</option>
              : clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))
            }
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Prioridad
          </label>
          <select
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isEdit && (
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Estado
            </label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En curso">En curso</option>
              <option value="Hecho">Hecho</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Fecha límite
          </label>
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {isEdit && (
            <Button type="button" variant="outline" size="sm" className="gap-1 text-[#EF4444]" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            className="gap-1.5 bg-[#131B2E] text-xs text-white"
            disabled={saving || !titulo.trim()}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
          </Button>
        </div>
      </div>
    </form>
  );
}
