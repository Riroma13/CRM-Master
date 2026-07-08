'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface ItemFormProps {
  sistemaId: string;
  initial?: {
    id?: string;
    nombre: string;
    categoria: string;
    estado: string;
    descripcion: string;
    responsable: string;
    fechaImplementacion: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIAS = ['Hardware', 'Software', 'Licencia', 'Infraestructura', 'Documentación', 'Usuario', 'Seguridad', 'Otro'];
const ESTADOS = ['Implementado', 'En progreso', 'Pendiente', 'Requiere atención'];

export function ItemForm({ sistemaId, initial, onSuccess, onCancel }: ItemFormProps) {
  const isEdit = !!initial?.id;
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [categoria, setCategoria] = useState(initial?.categoria ?? 'Hardware');
  const [estado, setEstado] = useState(initial?.estado ?? 'Implementado');
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '');
  const [responsable, setResponsable] = useState(initial?.responsable ?? '');
  const [fechaImplementacion, setFechaImplementacion] = useState(initial?.fechaImplementacion ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !categoria) return;
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      nombre: nombre.trim(),
      categoria,
      estado,
    };
    if (descripcion.trim()) body.descripcion = descripcion.trim();
    if (responsable.trim()) body.responsable = responsable.trim();
    if (fechaImplementacion) body.fechaImplementacion = fechaImplementacion;

    try {
      if (isEdit && initial?.id) {
        await api.patch(`/api/v1/tenant/sistemas/items/${initial.id}`, body, { auth: true });
      } else {
        await api.post(`/api/v1/tenant/sistemas/${sistemaId}/items`, body, { auth: true });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
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
          Nombre del item *
        </label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Servidor principal, Licencia Office 365..."
          className="mt-1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Categoría *
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Estado
          </label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Descripción
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Detalles del item..."
          rows={2}
          className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Responsable
          </label>
          <Input
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            placeholder="Nombre de la persona"
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Fecha implementación
          </label>
          <input
            type="date"
            value={fechaImplementacion}
            onChange={(e) => setFechaImplementacion(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="gap-1.5 bg-[#131B2E] text-xs text-white"
          disabled={saving || !nombre.trim()}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear item'}
        </Button>
      </div>
    </form>
  );
}
