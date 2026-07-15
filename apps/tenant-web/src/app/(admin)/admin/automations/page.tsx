'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { Dialog } from '@/components/ui/dialog'; import { useToast } from '@/components/ui/toast'; import { Zap, Plus, Save, Power, Trash2, History } from 'lucide-react';

const TRIGGERS = ['cita.confirmada', 'cita.cancelada', 'cliente.creado', 'incidencia.creada', 'documento.subido'];

export default function AutomationsPage() {
  const { toast } = useToast(); const [rules, setRules] = useState<any[]>([]); const [logs, setLogs] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [showLogs, setShowLogs] = useState(false);
  const [showForm, setShowForm] = useState(false); const [nombre, setNombre] = useState(''); const [trigger, setTrigger] = useState(TRIGGERS[0]); const [actionType, setActionType] = useState('email'); const [actionConfig, setActionConfig] = useState('{}'); const [saving, setSaving] = useState(false);

  const fetch = async () => { setLoading(true); try { setRules(await api.get<any[]>('/api/v1/tenant/automations/rules', undefined, { auth: true })); setLogs(await api.get<any[]>('/api/v1/tenant/automations/logs', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!nombre.trim()) return; setSaving(true);
    try { await api.post('/api/v1/tenant/automations/rules', { nombre: nombre.trim(), trigger, action: { type: actionType, config: JSON.parse(actionConfig || '{}') } }, { auth: true }); toast('success', 'Regla creada'); setShowForm(false); fetch(); } catch { toast('error', 'Error'); } finally { setSaving(false); } };
  const toggleRule = async (id: number) => { await api.post(`/api/v1/tenant/automations/rules/${id}/toggle`, {}, { auth: true }); fetch(); };
  const deleteRule = async (id: number) => { if (!confirm('¿Eliminar?')) return; await api.delete(`/api/v1/tenant/automations/rules/${id}`, { auth: true }); fetch(); };

  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Automatizaciones</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Automatizaciones</h1>
      <div className="flex gap-2"><Button variant="outline" size="sm" className="gap-1" onClick={() => setShowLogs(!showLogs)}><History className="h-3.5 w-3.5" /> {showLogs ? 'Reglas' : 'Historial'}</Button>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Nueva regla</Button></div></div>
    {showLogs ? (
      <div className="space-y-2">
        {logs.length === 0 ? (
          <p className="text-center text-[13px] text-[#45464D] py-8">Sin actividad</p>
        ) : (
          logs.map((l: any, i: number) => (
            <Card key={i} className="bg-white">
              <CardContent className="p-3 flex items-center gap-3">
                <Badge variant="outline" className={l.result === 'ok' ? 'bg-[#D1FAE5] text-[#10B981]' : 'bg-[#FEE2E2] text-[#EF4444]'}>
                  {l.result === 'ok' ? 'OK' : 'Error'}
                </Badge>
                <span className="text-[13px] text-[#1B1B1D]">{l.trigger}</span>
                <span className="text-[11px] text-[#45464D] ml-auto">{new Date(l.createdAt).toLocaleString('es-ES')}</span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    ) : (<div className="space-y-3">{rules.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12"><Zap className="h-10 w-10 text-[#45464D] mb-3" /><p className="text-sm font-semibold text-[#45464D]">Sin reglas de automatización</p></div>
    ) : rules.map(r => (<Card key={r.id} className="bg-white"><CardContent className="p-4 flex items-center justify-between">
      <div><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${r.activo ? 'bg-[#10B981]' : 'bg-[#C6C6CD]'}`} /><h3 className="text-[13px] font-medium text-[#1B1B1D]">{r.nombre}</h3></div>
        <p className="text-[11px] text-[#45464D] mt-1">SI {r.trigger} → {r.action.type} {r.action.config?.to ? `a ${r.action.config.to}` : ''}</p></div>
      <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => toggleRule(r.id)}><Power className={`h-4 w-4 ${r.activo ? 'text-[#10B981]' : 'text-[#45464D]'}`} /></Button>
        <Button variant="ghost" size="sm" className="text-[#EF4444]" onClick={() => deleteRule(r.id)}><Trash2 className="h-4 w-4" /></Button></div>
    </CardContent></Card>))}</div>)}
    <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nueva regla">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre *</label><Input value={nombre} onChange={e => setNombre(e.target.value)} className="mt-1" required /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Disparador</label>
          <select value={trigger} onChange={e => setTrigger(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]">{TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Acción</label>
          <select value={actionType} onChange={e => setActionType(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]"><option value="email">Enviar email</option><option value="webhook">Llamar webhook</option></select></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Config (JSON)</label>
          <textarea value={actionConfig} onChange={e => setActionConfig(e.target.value)} rows={3} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] font-mono" placeholder='{"to":"email@ejemplo.com","subject":"Alerta"}' /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" size="sm" className="bg-[#131B2E] text-xs text-white" disabled={saving || !nombre.trim()}><Save className="h-3.5 w-3.5" /> Crear</Button></div>
      </form>
    </Dialog>
  </div>);
}
