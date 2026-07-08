'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface ClienteFormData {
  nombre: string;
  tipoNegocio: string;
  estadoRelacion: string;
  saludGeneral: string;
  tags: string;
}

interface ClienteFormProps {
  /** If provided, we're editing — otherwise creating */
  initial?: ClienteFormData & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

const ESTADOS = ['Activo', 'En pausa', 'Cerrado', 'Prospecto'];
const SALUDES = ['🟢', '🟡', '🔴'];

export function ClienteForm({ initial, onSuccess, onCancel }: ClienteFormProps) {
  const isEdit = !!initial?.id;
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [tipoNegocio, setTipoNegocio] = useState(initial?.tipoNegocio ?? '');
  const [estadoRelacion, setEstadoRelacion] = useState(initial?.estadoRelacion ?? 'Activo');
  const [saludGeneral, setSaludGeneral] = useState(initial?.saludGeneral ?? '🟢');
  const [tags, setTags] = useState(initial?.tags ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      nombre: nombre.trim(),
      tipoNegocio: tipoNegocio.trim() || undefined,
      estadoRelacion,
      saludGeneral,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit && initial?.id) {
        await api.patch(`/api/v1/tenant/clientes/${initial.id}`, body, { auth: true });
      } else {
        await api.post('/api/v1/tenant/clientes', body, { auth: true });
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
          Nombre *
        </label>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del cliente"
          className="mt-1"
          required
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Tipo de negocio
        </label>
        <Input
          value={tipoNegocio}
          onChange={(e) => setTipoNegocio(e.target.value)}
          placeholder="Ej: Asesoría fiscal, Consultoría IT..."
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Estado relación
          </label>
          <select
            value={estadoRelacion}
            onChange={(e) => setEstadoRelacion(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Salud
          </label>
          <select
            value={saludGeneral}
            onChange={(e) => setSaludGeneral(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]"
          >
            {SALUDES.map((s) => (
              <option key={s} value={s}>{s} {s === '🟢' ? 'Buena' : s === '🟡' ? 'Media' : 'Crítica'}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Tags (separados por coma)
        </label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="VIP, recurrente, sector tecnología..."
          className="mt-1"
        />
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
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  );
}
