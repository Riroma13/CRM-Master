'use client'; import { useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { useToast } from '@/components/ui/toast'; import { Lock, Save } from 'lucide-react';

export default function CambiarPasswordPage() {
  const { toast } = useToast(); const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (password !== confirm) { toast('error', 'Las contraseñas no coinciden'); return; } if (password.length < 6) { toast('error', 'Mínimo 6 caracteres'); return; } setSaving(true);
    try { await api.patch('/api/v1/tenant/profile', { password }, { auth: true }); toast('success', 'Contraseña actualizada'); setCurrent(''); setPassword(''); setConfirm(''); } catch { toast('error', 'Error'); } finally { setSaving(false); } };
  return (<div className="space-y-6">
    <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Cambiar contraseña</h1>
    <Card className="bg-white"><CardContent className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="flex items-center gap-3 mb-4"><Lock className="h-5 w-5 text-[#45464D]" /><p className="text-[13px] text-[#45464D]">Actualizá tu contraseña de acceso al portal.</p></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Contraseña actual</label><Input type="password" value={current} onChange={e => setCurrent(e.target.value)} className="mt-1" required /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nueva contraseña</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1" required minLength={6} /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Confirmar contraseña</label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-1" required /></div>
        <div className="flex justify-end"><Button type="submit" size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" disabled={saving || !password || !confirm}><Save className="h-3.5 w-3.5" /> {saving ? 'Guardando...' : 'Actualizar contraseña'}</Button></div>
      </form>
    </CardContent></Card>
  </div>);
}
