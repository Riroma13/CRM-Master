'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Webhook, Plus, Save, Trash2 } from 'lucide-react';

const EVENTOS = ['cliente.creado', 'cliente.actualizado', 'cita.confirmada', 'cita.cancelada', 'incidencia.creada'];

export default function WebhooksPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState(''); const [eventos, setEventos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetch = async () => { setLoading(true); try { setItems(await api.get<any[]>('/api/v1/tenant/webhooks', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const toggleEvento = (e: string) => setEventos(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!url.trim() || eventos.length === 0) return; setSaving(true);
    try { await api.post('/api/v1/tenant/webhooks', { url: url.trim(), eventos }, { auth: true }); toast('success', 'Webhook creado'); setShowForm(false); fetch(); }
    catch { toast('error', 'Error'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este webhook?')) return;
    try { await api.delete(`/api/v1/tenant/webhooks/${id}`, { auth: true }); toast('success', 'Webhook desactivado'); fetch(); } catch { toast('error', 'Error'); }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Webhooks</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;

  return (<div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Webhooks</h1>
      <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Nuevo webhook</Button>
    </div>
    {items.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
        <Webhook className="h-10 w-10 text-[#45464D] mb-3" /><p className="text-sm font-semibold text-[#45464D]">Sin webhooks configurados</p>
        <p className="mt-1 text-xs text-[#45464D]">Los webhooks notifican a URLs externas cuando ocurren eventos</p>
      </div>
    ) : (<div className="space-y-3">{items.map((w) => (
      <Card key={w.id} className="bg-white"><CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div><p className="text-[13px] font-medium text-[#1B1B1D] break-all">{w.url}</p>
            <div className="flex flex-wrap gap-1 mt-1">{w.eventos?.map((e: string) => <Badge key={e} variant="default" className="text-[9px]">{e}</Badge>)}</div>
            {w.ultimoEnvio && <p className="text-[11px] text-[#45464D] mt-1">Último envío: {new Date(w.ultimoEnvio).toLocaleString('es-ES')}</p>}
            {w.ultimoError && <p className="text-[11px] text-[#EF4444] mt-1">Error: {w.ultimoError}</p>}
          </div>
          <Button variant="outline" size="sm" className="text-[#EF4444]" onClick={() => handleDelete(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </CardContent></Card>
    ))}</div>)}
    <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nuevo webhook">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">URL *</label><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://ejemplo.com/webhook" className="mt-1" required /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Eventos *</label>
          <div className="mt-1 space-y-2">{EVENTOS.map(e => (
            <label key={e} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={eventos.includes(e)} onChange={() => toggleEvento(e)} className="rounded" />
              <span className="text-[13px] text-[#1B1B1D]">{e}</span>
            </label>
          ))}</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" size="sm" className="bg-[#131B2E] text-xs text-white" disabled={saving || !url.trim() || eventos.length === 0}><Save className="h-3.5 w-3.5" /> Crear</Button>
        </div>
      </form>
    </Dialog>
  </div>);
}
