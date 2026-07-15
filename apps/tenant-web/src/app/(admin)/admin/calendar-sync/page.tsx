'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { useToast } from '@/components/ui/toast'; import { Calendar, Link2, Unlink, CheckCircle, XCircle } from 'lucide-react';

export default function CalendarSyncPage() {
  const { toast } = useToast(); const [status, setStatus] = useState<any>(null); const [loading, setLoading] = useState(true);
  const fetch = async () => { setLoading(true); try { setStatus(await api.get<any>('/api/v1/tenant/calendar/status', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const handleConnect = async () => {
    const email = prompt('Ingresa tu email de Google Calendar:');
    if (!email) return;
    try {
      const r = await api.post('/api/v1/tenant/calendar/connect', { accessToken: 'simulated', email }, { auth: true });
      setStatus(r); toast('success', 'Google Calendar conectado');
    } catch { toast('error', 'Error al conectar'); }
  };

  const handleDisconnect = async () => {
    try { await api.delete('/api/v1/tenant/calendar/disconnect', { auth: true }); setStatus({ connected: false }); toast('success', 'Desconectado'); } catch { toast('error', 'Error'); }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Google Calendar</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Google Calendar</h1>
    <Card className="bg-white"><CardContent className="p-6">
      <div className="flex items-center gap-3 mb-4"><Calendar className="h-6 w-6 text-[#45464D]" />
        <div><h2 className="text-[16px] font-semibold text-[#1B1B1D]">Sincronización de calendario</h2><p className="text-[13px] text-[#45464D]">Conectá tu Google Calendar para sincronizar las citas automáticamente.</p></div></div>
      <div className="flex items-center gap-3 mb-4">
        {status?.connected ? <><CheckCircle className="h-5 w-5 text-[#10B981]" /><span className="text-[13px] text-[#10B981]">Conectado{status.email ? ` como ${status.email}` : ''}</span></>
          : <><XCircle className="h-5 w-5 text-[#EF4444]" /><span className="text-[13px] text-[#EF4444]">No conectado</span></>}
      </div>
      <div className="flex gap-3">
        {status?.connected
          ? <Button variant="outline" size="sm" className="gap-1 text-[#EF4444]" onClick={handleDisconnect}><Unlink className="h-3.5 w-3.5" /> Desconectar</Button>
          : <Button size="sm" className="gap-1 bg-[#131B2E] text-xs text-white" onClick={handleConnect}><Link2 className="h-3.5 w-3.5" /> Conectar Google Calendar</Button>}
      </div>
    </CardContent></Card>
  </div>);
}
