'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Save } from 'lucide-react';

export default function PerfilPage() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<any>('/api/v1/tenant/profile', undefined, { auth: true })
      .then((d) => { setProfile(d); setName(d.name); setLogo(d.logo || ''); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/api/v1/tenant/profile', { name, logo: logo || null }, { auth: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Perfil</h1>
        <div className="h-40 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Perfil del negocio</h1>

      <Card className="bg-white">
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre del negocio</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">URL del logo</label>
            <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://ejemplo.com/logo.png" className="mt-1" />
            {logo && (
              <img src={logo} alt="Logo preview" className="mt-2 h-12 w-12 rounded-[0.25rem] border border-[#E2E8F0] object-contain" />
            )}
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Slug</label>
            <p className="mt-1 text-[13px] text-[#45464D]">{profile?.slug}</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
            {saved && <span className="text-[13px] text-[#10B981]">✓ Guardado</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
