'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { Dialog } from '@/components/ui/dialog'; import { useToast } from '@/components/ui/toast'; import { FileDigit, Plus, Save, Trash2 } from 'lucide-react';

export default function PlantillasPage() {
  const { toast } = useToast(); const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false); const [nombre, setNombre] = useState(''); const [tipo, setTipo] = useState('documento'); const [contenido, setContenido] = useState('');
  const [editing, setEditing] = useState<any>(null); const [saving, setSaving] = useState(false);
  const fetch = async () => { setLoading(true); try { setItems(await api.get<any[]>('/api/v1/tenant/plantillas', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);
  const openEdit = (p: any) => { setEditing(p); setNombre(p.nombre); setTipo(p.tipo); setContenido(p.contenido); setShowForm(true); };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!nombre.trim()) return; setSaving(true);
    try { if (editing) { await api.patch(`/api/v1/tenant/plantillas/${editing.id}`, { nombre: nombre.trim(), tipo, contenido }, { auth: true }); toast('success', 'Plantilla actualizada'); } else { await api.post('/api/v1/tenant/plantillas', { nombre: nombre.trim(), tipo, contenido }, { auth: true }); toast('success', 'Plantilla creada'); } setShowForm(false); setEditing(null); fetch(); } catch { toast('error', 'Error'); } finally { setSaving(false); } };
  const handleDelete = async (id: string) => { if (!confirm('¿Eliminar?')) return; try { await api.delete(`/api/v1/tenant/plantillas/${id}`, { auth: true }); toast('success', 'Eliminada'); fetch(); } catch { toast('error', 'Error'); } };
  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Plantillas</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Plantillas</h1>
      <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => { setEditing(null); setNombre(''); setTipo('documento'); setContenido(''); setShowForm(true); }}><Plus className="h-3.5 w-3.5" /> Nueva plantilla</Button></div>
    {items.length === 0 ? (<div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12"><FileDigit className="h-10 w-10 text-[#45464D] mb-3" /><p className="text-sm font-semibold text-[#45464D]">Sin plantillas</p></div>) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(p => (
        <Card key={p.id} className="bg-white cursor-pointer hover:shadow-md" onClick={() => openEdit(p)}><CardContent className="p-4">
          <div className="flex items-start justify-between"><div><h3 className="text-[16px] font-semibold text-[#1B1B1D]">{p.nombre}</h3><Badge variant="outline" className="mt-1 text-[10px]">{p.tipo}</Badge></div>
            <Button variant="ghost" size="sm" className="text-[#EF4444]" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-4 w-4" /></Button></div>
        </CardContent></Card>
      ))}</div>)}
    <Dialog open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar plantilla' : 'Nueva plantilla'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre *</label><Input value={nombre} onChange={e => setNombre(e.target.value)} className="mt-1" required /></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px]"><option value="documento">Documento</option><option value="contrato">Contrato</option><option value="presupuesto">Presupuesto</option></select></div>
        <div><label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Contenido (HTML con variables {'{{nombre}}'}, {'{{fecha}}'})</label>
          <textarea value={contenido} onChange={e => setContenido(e.target.value)} rows={8} className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] font-mono" /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" size="sm" className="bg-[#131B2E] text-xs text-white" disabled={saving || !nombre.trim()}><Save className="h-3.5 w-3.5" /> Guardar</Button></div>
      </form>
    </Dialog>
  </div>);
}
