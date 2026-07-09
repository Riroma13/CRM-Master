'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Rocket, Copy, CheckCircle, ExternalLink } from 'lucide-react';

export default function OnboardingPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generateSlug = (val: string) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !adminEmail.trim()) return;
    setCreating(true);
    setResult(null);
    try {
      const data = await api.post<any>('/api/v1/admin/tenants', {
        name: name.trim(),
        slug: slug.trim(),
        adminEmail: adminEmail.trim(),
        adminName: adminName.trim() || undefined,
      }, { auth: true });
      setResult(data);
      toast('success', 'Tenant creado correctamente');
    } catch (err: any) {
      toast('error', err?.message || 'Error al crear tenant');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast('success', 'Copiado al portapapeles');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Onboarding</h1>
      <p className="text-[13px] text-[#45464D]">Crea un nuevo tenant con su portal, admin y configuración inicial.</p>

      {!result ? (
        <Card className="bg-white">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre del negocio *</label>
                <Input value={name} onChange={(e) => { setName(e.target.value); generateSlug(e.target.value); }} placeholder="Ej: Taller García" className="mt-1" required />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Slug *</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[13px] text-[#45464D] whitespace-nowrap">https://</span>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="taller-garcia" className="flex-1" required />
                  <span className="text-[13px] text-[#45464D] whitespace-nowrap">.crm-master.duckdns.org</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Email del admin *</label>
                  <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@taller.com" className="mt-1" required />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre del admin</label>
                  <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Juan García" className="mt-1" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" disabled={creating}>
                  <Rocket className="h-3.5 w-3.5" />
                  {creating ? 'Creando tenant...' : 'Crear tenant'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Success */
        <div className="space-y-4">
          <Card className="bg-white border-[#10B981] border-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-[#10B981]" />
                <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Tenant creado exitosamente</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-[0.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D] mb-1">Portal</p>
                  <div className="flex items-center justify-between">
                    <a href={result.portalUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#131B2E] underline flex items-center gap-1">
                      {result.portalUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                    <button onClick={() => copyToClipboard(result.portalUrl)} className="p-1 hover:bg-[#F0EDEF] rounded">
                      <Copy className="h-3.5 w-3.5 text-[#45464D]" />
                    </button>
                  </div>
                </div>

                <div className="rounded-[0.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D] mb-1">Admin</p>
                  <p className="text-[13px] text-[#1B1B1D]">{result.admin?.email}</p>
                  <p className="text-[11px] text-[#45464D]">Contraseña por defecto: <strong>password</strong></p>
                </div>

                <div className="rounded-[0.25rem] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D] mb-1">Token de acceso</p>
                  <div className="flex items-center justify-between">
                    <code className="text-[12px] text-[#1B1B1D] break-all">{result.sessionToken}</code>
                    <button onClick={() => copyToClipboard(result.sessionToken)} className="p-1 hover:bg-[#F0EDEF] rounded ml-2 shrink-0">
                      <Copy className="h-3.5 w-3.5 text-[#45464D]" />
                    </button>
                  </div>
                </div>
              </div>

              <Button size="sm" className="mt-4 gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setResult(null)}>
                Crear otro tenant
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
