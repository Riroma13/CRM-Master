'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { useToast } from '@/components/ui/toast'; import { Bell, Mail, MessageCircle } from 'lucide-react';

export default function PreferenciasPage() {
  const { toast } = useToast(); const [email, setEmail] = useState(''); const [notifEmail, setNotifEmail] = useState(true); const [notifWhatsApp, setNotifWhatsApp] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const userData = JSON.parse(sessionStorage.getItem('crm_user') || '{}');
      if (userData?.email) setEmail(userData.email);
    } catch {}
    setLoading(false);
  }, []);

  const handleSave = async () => {
    if (!email) return; setSaving(true);
    try { await api.patch('/api/v1/tenant/preferencias', { email, notifEmail, notifWhatsApp }, { auth: true }); toast('success', 'Preferencias guardadas'); } catch { toast('error', 'Error'); } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Preferencias</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Preferencias de notificación</h1>
    <Card className="bg-white"><CardContent className="p-6 space-y-4">
      <div className="flex items-center justify-between p-3 rounded-[0.25rem] border border-[#E2E8F0]">
        <div className="flex items-center gap-3"><Mail className="h-5 w-5 text-[#45464D]" /><div><p className="text-[13px] font-medium text-[#1B1B1D]">Notificaciones por email</p><p className="text-[11px] text-[#45464D]">Recordatorios de citas, alertas de incidencias</p></div></div>
        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} className="sr-only peer" />
          <div className="w-9 h-5 bg-[#C6C6CD] rounded-full peer peer-checked:bg-[#131B2E] after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div></label>
      </div>
      <div className="flex items-center justify-between p-3 rounded-[0.25rem] border border-[#E2E8F0]">
        <div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-[#45464D]" /><div><p className="text-[13px] font-medium text-[#1B1B1D]">Notificaciones por WhatsApp</p><p className="text-[11px] text-[#45464D]">Próximamente — requiere integración con WhatsApp API</p></div></div>
        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={notifWhatsApp} onChange={e => setNotifWhatsApp(e.target.checked)} className="sr-only peer" />
          <div className="w-9 h-5 bg-[#C6C6CD] rounded-full peer peer-checked:bg-[#131B2E] after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div></label>
      </div>
      <div className="flex justify-end"><Button size="sm" className="bg-[#131B2E] text-xs text-white" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar preferencias'}</Button></div>
    </CardContent></Card>
  </div>);
}
