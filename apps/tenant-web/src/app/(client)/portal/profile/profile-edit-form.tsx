'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@crm-master/ui';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';

interface ClienteData {
  id: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export function ProfileEditForm({ cliente }: { cliente: ClienteData | null }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(cliente?.nombre || '');
  const [telefono, setTelefono] = useState(cliente?.telefono || '');
  const [direccion, setDireccion] = useState(cliente?.direccion || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/v1/client/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, direccion }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.message || 'Error al actualizar el perfil');
      }

      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre</label>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1" />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Teléfono</label>
        <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="mt-1" />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Dirección</label>
        <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} className="mt-1" />
      </div>

      {error && (
        <div className="rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3">
          <p className="text-[13px] text-[#EF4444]">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-[0.25rem] border border-[#D1FAE5]/30 bg-[#D1FAE5] p-3">
          <p className="text-[13px] text-[#10B981] font-medium">✓ Perfil actualizado correctamente</p>
        </div>
      )}

      <Button type="submit" className="w-full gap-2 bg-[#131B2E] text-xs text-white" disabled={loading}>
        <Save className="h-3.5 w-3.5" />
        {loading ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
