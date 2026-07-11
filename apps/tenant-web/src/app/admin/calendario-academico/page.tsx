'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { Dialog } from '@/components/ui/dialog'; import { useToast } from '@/components/ui/toast'; import { Calendar, Plus, Save, Trash2 } from 'lucide-react';

const TIPO_COLORS: Record<string,string> = { festivo:'bg-[#DAE2FD] text-[#131B2E]', examen:'bg-[#FEE2E2] text-[#EF4444]', evento:'bg-[#D1FAE5] text-[#10B981]', periodo_notas:'bg-[#FEF3C7] text-[#F59E0B]' };

export default function CalendarioAcademicoPage() {
  const { toast } = useToast(); const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false); const [titulo, setTitulo] = useState(''); const [tipo, setTipo] = useState('festivo'); const [fechaInicio, setFechaInicio] = useState(''); const [fechaFin, setFechaFin] = useState(''); const [desc, setDesc] = useState('');
  const fetch = async () => { setLoading(true); try { setItems(await api.get<any[]>(`/api/v1/tenant/eventos-academicos?year=${year}`, undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, [year]);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!titulo.trim() || !fechaInicio) return;
    try { await api.post('/api/v1/tenant/eventos-academicos', { titulo: titulo.trim(), tipo, fechaInicio, fechaFin: fechaFin || undefined, descripcion: desc.trim() || undefined }, { auth: true }); toast('success', 'Evento creado'); setShowForm(false); fetch(); } catch { toast('error', 'Error'); } };
  const handleDelete = async (id: string) => { if (!confirm('¿Eliminar?')) return; try { await api.delete(`/api/v1/tenant/eventos-academicos/${id}`, { auth: true }); toast('success', 'Eliminado'); fetch(); } catch { toast('error', 'Error'); } };
  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Calendario académico</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Calendario académico</h1>
      <div className="flex items-center gap-2"><select value={year} onChange={e => setYear(parseInt(e.target.value))} className="rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-1.5 text-[13px]">
        {Array.from({length:5}, (_, i) => year - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}</select>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5" /> Nuevo evento</Button></div></div>
    {items.length === 0 ? <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12"><Calendar className="h-10 w-10 text-[#45464D] mb-3" /><p className="text-sm font-semibold text-[#45464D]">Sin eventos para {year}</p></div> :
      <div className="space-y-2">{items.map((e: any) => <Card key={e.id} className="bg-white"><CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><Badge variant="outline" className={TIPO_COLORS[e.tipo] ?? ''}>{e.tipo}</Badge>
          <div><p className="text-[13px] font-medium text-[#1B1B1D]">{e.titulo}</p><p className="text-[11px] text-[#45464D]">{new Date(e.fechaInicio).toLocaleDateString('es-ES')}{e.fechaFin ? ` — ${new Date(e.fechaFin).toLocaleDateString('es-ES')}` : ''}</p></div></div>
        <Button variant="ghost" size="sm" className="text-[#EF4444]" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
      </CardContent></Card>)}</div>}
    <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nuevo evento académico">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Título *</label><Input value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1" required /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]"><option value="festivo">Festivo</option><option value="examen">Examen</option><option value="evento">Evento</option><option value="periodo_notas">Período de notas</option></select></div>
        <div className="grid grid-cols-2 gap-4"><div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Fecha inicio *</label><input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]" required /></div>
          <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Fecha fin</label><input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]" /></div></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Descripción</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] resize-none" /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" size="sm" className="bg-[#131B2E] text-xs text-white"><Save className="h-3.5 w-3.5" /> Crear</Button></div>
      </form>
    </Dialog>
  </div>);
}
