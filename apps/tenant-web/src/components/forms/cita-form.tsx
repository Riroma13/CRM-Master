'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface CitaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CitaForm({ onSuccess, onCancel }: CitaFormProps) {
  const [titulo, setTitulo] = useState('Consulta');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [duracion, setDuracion] = useState('30');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha || !hora) return;
    setSaving(true);
    setError(null);

    const fechaObj = new Date(`${fecha}T${hora}:00`);
    if (isNaN(fechaObj.getTime())) {
      setError('Fecha u hora inválida');
      setSaving(false);
      return;
    }

    try {
      await api.post('/api/v1/tenant/calendario/citas/admin', {
        fecha: fechaObj.toISOString(),
        duracion: parseInt(duracion, 10),
        titulo: titulo.trim(),
        clienteNombre: clienteNombre.trim() || undefined,
        clienteEmail: clienteEmail.trim() || undefined,
        clienteTelefono: clienteTelefono.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
      }, { auth: true });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cita');
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
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Título</label>
        <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Consulta fiscal" className="mt-1" />
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Cliente *</label>
        <Input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Nombre del cliente" className="mt-1" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Email</label>
          <Input type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="cliente@email.com" className="mt-1" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Teléfono</label>
          <Input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} placeholder="612345678" className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
            required
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Hora *</label>
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
            required
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Duración</label>
          <select
            value={duracion}
            onChange={(e) => setDuracion(e.target.value)}
            className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]"
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Notas adicionales..."
          rows={2}
          className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" disabled={saving || !fecha || !hora || !clienteNombre.trim()}>
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Guardando...' : 'Crear cita'}
        </Button>
      </div>
    </form>
  );
}
