'use client'; import { useEffect, useState } from 'react'; import { api } from '@/lib/api'; import { Card, CardContent } from '@/components/ui/card'; import { Badge } from '@/components/ui/badge'; import { Button } from '@/components/ui/button'; import { useToast } from '@/components/ui/toast'; import { CreditCard, CheckCircle } from 'lucide-react';

const PLANES = [
  { id: 'gratuito', label: 'Gratuito', price: 0, clientes: 10, storage: 500, users: 1 },
  { id: 'profesional', label: 'Profesional', price: 29, clientes: 100, storage: 5000, users: 5 },
  { id: 'empresa', label: 'Empresa', price: 99, clientes: -1, storage: 50000, users: -1 },
];

export default function PlanesPage() {
  const { toast } = useToast(); const [plan, setPlan] = useState<any>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { api.get<any>('/api/v1/tenant/plan', undefined, { auth: true }).then(setPlan).catch(() => {}).finally(() => setLoading(false)); }, []);
  const cambiar = async (p: string) => { try { await api.patch('/api/v1/tenant/plan', { plan: p }, { auth: true }); toast('success', `Plan cambiado a ${p}`); setPlan({ ...plan, plan: p }); } catch { toast('error', 'Error'); } };
  if (loading) return <div className="space-y-6"><h1 className="text-[16px] font-semibold text-[#1B1B1D]">Plan</h1><div className="h-32 animate-pulse rounded-[0.5rem] border bg-white" /></div>;
  return (<div className="space-y-6">
    <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Plan y suscripción</h1>
    <p className="text-[13px] text-[#45464D]">Plan actual: <strong>{plan?.plan}</strong></p>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{PLANES.map(p => {
      const isActive = plan?.plan === p.id;
      return <Card key={p.id} className={`bg-white cursor-pointer transition-all ${isActive ? 'ring-2 ring-[#131B2E]' : 'hover:shadow-md'}`} onClick={() => cambiar(p.id)}>
        <CardContent className="p-6 text-center"><h2 className="text-[18px] font-semibold text-[#1B1B1D]">{p.label}</h2>
          <p className="text-[30px] font-bold text-[#1B1B1D] mt-2">${p.price}<span className="text-[14px] font-normal text-[#45464D]">/mes</span></p>
          <ul className="mt-4 space-y-2 text-[13px] text-[#45464D] text-left">
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#10B981]" />{p.clientes === -1 ? 'Clientes ilimitados' : `Hasta ${p.clientes} clientes`}</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#10B981]" />{p.storage >= 1000 ? `${p.storage / 1000}GB` : `${p.storage}MB`} almacenamiento</li>
            <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-[#10B981]" />{p.users === -1 ? 'Usuarios ilimitados' : `${p.users} usuario${p.users > 1 ? 's' : ''}`}</li>
          </ul>
          {isActive && <Badge variant="default" className="mt-4 bg-[#131B2E]">Plan actual</Badge>}
        </CardContent></Card>;
    })}</div>
  </div>);
}
