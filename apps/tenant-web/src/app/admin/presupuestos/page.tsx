'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { FileText, Plus, Save, Trash2 } from 'lucide-react';

const ESTADO_COLORS: Record<string,string> = { borrador:'bg-[#F0EDEF] text-[#45464D]', enviado:'bg-[#DAE2FD] text-[#131B2E]', aceptado:'bg-[#D1FAE5] text-[#10B981]', rechazado:'bg-[#FEE2E2] text-[#EF4444]' };

export default function PresupuestosPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState(''); const [clienteId, setClienteId] = useState(''); const [clientes, setClientes] = useState<any[]>([]);
  const [lineas, setLineas] = useState<any[]>([{ concepto: '', cantidad: 1, precioUnitario: 0 }]);
  const [saving, setSaving] = useState(false);

  const fetch = async () => { setLoading(true); try { setItems(await api.get<any[]>('/api/v1/tenant/presupuestos', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); api.get<any[]>('/api/v1/tenant/clientes', undefined, { auth: true }).then(setClientes).catch(() => {}); }, []);

  const totalLineas = () => lineas.reduce((s, l) => s + (l.cantidad || 0) * (l.precioUnitario || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!titulo.trim()) return; setSaving(true);
    try {
      await api.post('/api/v1/tenant/presupuestos', { titulo: titulo.trim(), clienteId: clienteId || undefined, lineas, total: totalLineas() }, { auth: true });
      toast('success', 'Presupuesto creado'); setShowForm(false); fetch();
    } catch { toast('error', 'Error'); } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Presupuestos</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;

  return (<div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Presupuestos</h1>
      <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Nuevo presupuesto</Button>
    </div>
    {items.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
        <FileText className="h-10 w-10 text-[#45464D] mb-3" />
        <p className="text-sm font-semibold text-[#45464D]">Sin presupuestos</p>
      </div>
    ) : (
      <div className="space-y-3">{items.map((p) => (
        <Card key={p.id} className="bg-white"><CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div><h3 className="text-[16px] font-semibold text-[#1B1B1D]">{p.titulo}</h3>{p.cliente && <p className="text-[13px] text-[#45464D]">{p.cliente.nombre}</p>}</div>
            <div className="flex items-center gap-2"><Badge variant="outline" className={ESTADO_COLORS[p.estado] ?? ''}>{p.estado}</Badge><span className="text-[16px] font-semibold">${p.total?.toFixed(2)}</span></div>
          </div>
        </CardContent></Card>
      ))}</div>
    )}
    <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nuevo presupuesto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Título *</label><Input value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1" required /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Cliente</label>
          <select value={clienteId} onChange={e => setClienteId(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]">
            <option value="">Sin cliente</option>{clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Líneas</label>
          {lineas.map((l, i) => (<div key={i} className="flex items-center gap-2 mt-1">
            <input value={l.concepto} onChange={e => { const n = [...lineas]; n[i].concepto = e.target.value; setLineas(n); }} placeholder="Concepto" className="flex-1 rounded-[0.25rem] border border-[#E2E8F0] px-2 py-1.5 text-[13px]" />
            <input type="number" value={l.cantidad} onChange={e => { const n = [...lineas]; n[i].cantidad = parseInt(e.target.value) || 0; setLineas(n); }} className="w-16 rounded-[0.25rem] border border-[#E2E8F0] px-2 py-1.5 text-[13px]" />
            <input type="number" value={l.precioUnitario} onChange={e => { const n = [...lineas]; n[i].precioUnitario = parseFloat(e.target.value) || 0; setLineas(n); }} className="w-24 rounded-[0.25rem] border border-[#E2E8F0] px-2 py-1.5 text-[13px]" placeholder="Precio" />
            {i > 0 && <button type="button" onClick={() => setLineas(lineas.filter((_, j) => j !== i))} className="text-[#EF4444]"><Trash2 className="h-4 w-4" /></button>}
          </div>))}
          <button type="button" onClick={() => setLineas([...lineas, { concepto: '', cantidad: 1, precioUnitario: 0 }])} className="mt-1 text-[12px] text-[#131B2E]">+ Añadir línea</button>
          <p className="mt-2 text-[14px] font-semibold text-right">Total: ${totalLineas().toFixed(2)}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" disabled={saving || !titulo.trim()}><Save className="h-3.5 w-3.5" /> Crear</Button>
        </div>
      </form>
    </Dialog>
  </div>);
}
