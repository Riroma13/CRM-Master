'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit3, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ItemForm } from '@/components/forms/item-form';
import { SistemaForm } from '@/components/forms/sistema-form';
import { PageHeader } from '@/components/foundation/page-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';
import { DataRow } from '@/components/foundation/data-row';

interface ItemInventario { id: string; nombre: string; categoria: string; estado: string; }
interface SistemaDetail { id: string; nombreSistema: string; tipo: string; entorno?: string; version?: string; estadoTecnico: string; fechaUltimoChequeo?: string; cliente?: { id: string; nombre: string } | null; items: ItemInventario[]; }

export default function SistemaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sistema, setSistema] = useState<SistemaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showSistemaForm, setShowSistemaForm] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(false); try { setSistema(await api.get<SistemaDetail>(`/api/v1/tenant/sistemas/${id}`, undefined, { auth: true })); } catch { setError(true); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <StatePanel state="loading" label="system details" title="Loading system details" />;
  if (error || !sistema) return <div className="space-y-4"><Link href="/admin/sistemas" className="inline-flex items-center gap-2 text-sm text-[#0F172A] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"><ArrowLeft className="h-4 w-4" />Back to systems</Link><StatePanel state="error" title="Unable to load system" description="Try again to refresh this system." onRetry={load} /></div>;
  return <div className="space-y-6">
    <Link href="/admin/sistemas" className="inline-flex items-center gap-2 text-sm text-[#0F172A] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"><ArrowLeft className="h-4 w-4" />Back to systems</Link>
    <PageHeader title={sistema.nombreSistema} description={sistema.cliente?.nombre} action={<div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => setShowSistemaForm(true)}><Edit3 className="mr-2 h-4 w-4" />Edit system</Button><StatusBadge status="active" label={sistema.estadoTecnico} /></div>} />
    <Card><CardContent className="grid grid-cols-1 gap-4 p-4 text-sm sm:grid-cols-2"><div><span className="text-[#45464D]">Type</span><p>{sistema.tipo}</p></div>{sistema.entorno ? <div><span className="text-[#45464D]">Environment</span><p>{sistema.entorno}</p></div> : null}{sistema.version ? <div><span className="text-[#45464D]">Version</span><p>{sistema.version}</p></div> : null}{sistema.fechaUltimoChequeo ? <div><span className="text-[#45464D]">Last check</span><p>{new Date(sistema.fechaUltimoChequeo).toLocaleDateString('es-ES')}</p></div> : null}</CardContent></Card>
    <section aria-label="Inventory" className="space-y-3"><PageHeader title="Inventory" action={<Button size="sm" variant="outline" onClick={() => setShowItemForm(true)}><Plus className="mr-2 h-4 w-4" />Add item</Button>} />{sistema.items.length === 0 ? <StatePanel state="empty" title="No inventory items yet" /> : <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">{sistema.items.map((item) => <DataRow key={item.id} label={item.nombre} cells={[{ label: 'Category', value: item.categoria }, { label: 'Status', value: <StatusBadge status="active" label={item.estado} /> }]} />)}</div>}</section>
    <Dialog open={showItemForm} onClose={() => setShowItemForm(false)} title="Add inventory item"><ItemForm sistemaId={sistema.id} onSuccess={() => { setShowItemForm(false); void load(); }} onCancel={() => setShowItemForm(false)} /></Dialog>
    <Dialog open={showSistemaForm} onClose={() => setShowSistemaForm(false)} title="Edit system"><SistemaForm initial={{ id: sistema.id, nombreSistema: sistema.nombreSistema, tipo: sistema.tipo, clienteId: sistema.cliente?.id ?? '', entorno: sistema.entorno ?? '', version: sistema.version ?? '' }} onSuccess={() => { setShowSistemaForm(false); void load(); }} onCancel={() => setShowSistemaForm(false)} /></Dialog>
  </div>;
}
