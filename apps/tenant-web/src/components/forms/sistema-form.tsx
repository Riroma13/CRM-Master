'use client';

import { use, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface ClienteOption {
  id: string;
  nombre: string;
}

interface SistemaFormData {
  nombreSistema: string;
  tipo: string;
  clienteId: string;
  entorno: string;
  version: string;
}

interface SistemaFormProps {
  initial?: SistemaFormData & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

const TIPOS = ['ERP', 'CRM', 'CMS', 'E-commerce', 'Gestión documental', 'Contabilidad', 'RRHH', 'Otro'];
const ENTORNOS = ['Producción', 'Staging', 'Desarrollo', 'Testing'];

export function SistemaForm({ initial, onSuccess, onCancel }: SistemaFormProps) {
  const isEdit = !!initial?.id;
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [nombreSistema, setNombreSistema] = useState(initial?.nombreSistema ?? '');
  const [tipo, setTipo] = useState(initial?.tipo ?? '');
  const [clienteId, setClienteId] = useState(initial?.clienteId ?? '');
  const [entorno, setEntorno] = useState(initial?.entorno ?? 'Producción');
  const [version, setVersion] = useState(initial?.version ?? '');
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
    if (!nombreSistema.trim() || !tipo || !clienteId) return;
    setSaving(true);
    setError(null);

    const body = {
      nombreSistema: nombreSistema.trim(),
      tipo,
      clienteId,
      entorno: entorno || undefined,
      version: version.trim() || undefined,
    };

    try {
      if (isEdit && initial?.id) {
        await api.patch(`/api/v1/tenant/sistemas/${initial.id}`, body, { auth: true });
      } else {
        await api.post('/api/v1/tenant/sistemas', body, { auth: true });
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

      {!isEdit && (
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Cliente *
          </label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
            required
          >
            <option value="">
              {loadingClientes ? 'Cargando clientes...' : 'Seleccionar cliente'}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Nombre del sistema *
        </label>
        <Input
          value={nombreSistema}
          onChange={(e) => setNombreSistema(e.target.value)}
          placeholder="Ej: SAP ERP, WordPress..."
          className="mt-1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Tipo *
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
            required
          >
            <option value="">Seleccionar tipo</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            Entorno
          </label>
          <select
            value={entorno}
            onChange={(e) => setEntorno(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            {ENTORNOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Versión
        </label>
        <Input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Ej: v2.1.0, 2024.1..."
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
          disabled={saving || !nombreSistema.trim() || !tipo || (!isEdit && !clienteId)}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear sistema'}
        </Button>
      </div>
    </form>
  );
}
