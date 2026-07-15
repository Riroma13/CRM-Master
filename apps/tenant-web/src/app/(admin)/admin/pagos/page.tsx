'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button'; import { useToast } from '@/components/ui/toast'; import { CreditCard, Plus } from 'lucide-react';

const ESTADO_COLORS: Record<string,string> = { pendiente:'bg-[#FEF3C7] text-[#F59E0B]', completado:'bg-[#D1FAE5] text-[#10B981]', fallido:'bg-[#FEE2E2] text-[#EF4444]', reembolsado:'bg-[#F0EDEF] text-[#45464D]' };

export default function PagosPage() {
  const { toast } = useToast(); const [items, setItems] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const fetch = async () => { setLoading(true); try { setItems(await api.get<any[]>('/api/v1/tenant/pagos', undefined, { auth: true })); } catch {} setLoading(false); };
  useEffect(() => { fetch(); }, []);
  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Pagos</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Pagos</h1></div>
    {items.length === 0 ? (<div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12"><CreditCard className="h-10 w-10 text-[#45464D] mb-3" /><p className="text-sm font-semibold text-[#45464D]">Sin pagos registrados</p></div>) : (
      <div className="space-y-3">{items.map(p => (<Card key={p.id} className="bg-white"><CardContent className="p-4 flex items-center justify-between">
        <div><p className="text-[13px] font-medium text-[#1B1B1D]">{p.presupuesto?.titulo || 'Pago directo'}</p><p className="text-[11px] text-[#45464D]">{new Date(p.createdAt).toLocaleDateString('es-ES')}</p></div>
        <div className="flex items-center gap-3"><span className="text-[16px] font-semibold">${p.monto?.toFixed(2)}</span><Badge variant="outline" className={ESTADO_COLORS[p.estado] ?? ''}>{p.estado}</Badge></div>
      </CardContent></Card>))}</div>)}
  </div>);
}
