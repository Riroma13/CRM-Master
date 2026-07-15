'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Button } from '@/components/ui/button'; import { Star, RefreshCw } from 'lucide-react';

export default function EncuestasPage() {
  const [items, setItems] = useState<any[]>([]); const [prom, setProm] = useState<any>(null); const [loading, setLoading] = useState(true);
  const fetch = async () => { setLoading(true); try { setItems(await api.get<any[]>('/api/v1/tenant/encuestas', undefined, { auth: true })); setProm(await api.get<any>('/api/v1/tenant/encuestas/promedio', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);
  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Encuestas</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Encuestas de satisfacción</h1><Button variant="outline" size="sm" className="gap-1" onClick={fetch}><RefreshCw className="h-3.5 w-3.5" /> Actualizar</Button></div>
    {prom && <Card className="bg-white"><CardContent className="p-4 flex items-center gap-4"><Star className="h-8 w-8 text-[#F59E0B]" /><div><p className="text-[30px] font-bold text-[#1B1B1D]">{prom.promedio?.toFixed(1) ?? '-'} <span className="text-[14px] font-normal text-[#45464D]">/ 5</span></p><p className="text-[13px] text-[#45464D]">{prom.total ?? 0} respuestas</p></div></CardContent></Card>}
    {items.length === 0 ? <p className="text-center text-[13px] text-[#45464D] py-8">Sin encuestas respondidas</p> :
      <div className="space-y-2">{items.map((e: any) => <Card key={e.id} className="bg-white"><CardContent className="p-3 flex items-center gap-3"><div className="flex gap-0.5">{Array.from({length:5}).map((_,i) => <Star key={i} className={`h-4 w-4 ${i < e.puntuacion ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#C6C6CD]'}`} />)}</div><span className="text-[13px] text-[#45464D]">{e.tipo}</span>{e.comentario && <span className="text-[13px] text-[#1B1B1D]">— {e.comentario}</span>}</CardContent></Card>)}</div>}
  </div>);
}
