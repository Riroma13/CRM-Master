'use client';

import { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface TenantIdentitySettings {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantIdentitySettings | null>(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<TenantIdentitySettings>('/api/v1/tenant/settings', undefined, { auth: true })
      .then((data) => {
        setSettings(data);
        setName(data.name);
        setLogo(data.logo ?? '');
      })
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError('El nombre del negocio es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await api.patch<TenantIdentitySettings>(
        '/api/v1/tenant/settings',
        { name: normalizedName, logo: logo.trim() || null },
        { auth: true },
      );
      setSettings(result);
      setName(result.name);
      setLogo(result.logo ?? '');
      setSaved(true);
    } catch {
      setError('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div role="status">Cargando configuración...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4" aria-hidden="true" />
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Configuración</h1>
      </div>
      {error && <div role="alert" className="text-sm text-[#B91C1C]">{error}</div>}
      <Card className="bg-white">
        <CardContent className="space-y-4 p-6">
          <div>
            <label htmlFor="settings-name" className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre del negocio</label>
            <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1" disabled={!settings || saving} />
          </div>
          <div>
            <label htmlFor="settings-logo" className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">URL del logo</label>
            <Input id="settings-logo" value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="https://ejemplo.com/logo.png" className="mt-1" disabled={!settings || saving} />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={handleSave} disabled={!settings || saving}>
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
