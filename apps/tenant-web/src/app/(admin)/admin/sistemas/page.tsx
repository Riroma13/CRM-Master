'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSistemas } from '@/hooks/use-sistemas';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { SistemaForm } from '@/components/forms/sistema-form';
import { PageHeader } from '@/components/foundation/page-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';
import { DataRow } from '@/components/foundation/data-row';

export default function SistemasPage() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const { sistemas, isLoading, isError, refetch } = useSistemas();

  if (isLoading) return <StatePanel state="loading" label="systems" title="Loading systems" />;
  if (isError) return <StatePanel state="error" title="Unable to load systems" description="Try again to refresh systems." onRetry={refetch} />;

  return <div className="space-y-6">
    <PageHeader title="Systems" description="Review connected systems and their current technical state." action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />New system</Button>} />
    {sistemas.length === 0 ? <StatePanel state="empty" title="No systems yet" description="Systems will appear here when they are connected." /> : <div className="overflow-hidden rounded-lg border border-[#E2E8F0]" role="table" aria-label="Systems"><div className="hidden border-b bg-[#F8FAFC] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#45464D] md:grid md:grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(8rem,1fr))]"><span>System</span><span>Status</span><span>Client</span><span>Inventory</span></div>{sistemas.map((system) => <DataRow key={system.id} label={system.nombreSistema} href={`/admin/sistemas/${system.id}`} cells={[{ label: 'Status', value: <StatusBadge status="active" label={system.estadoTecnico} /> }, { label: 'Client', value: system.cliente?.nombre ?? '—' }, { label: 'Inventory', value: system._count?.items ?? 0 }]} />)}</div>}
    <Dialog open={showForm} onClose={() => setShowForm(false)} title="New system"><SistemaForm onSuccess={() => { setShowForm(false); refetch(); toast('success', 'System created successfully'); }} onCancel={() => setShowForm(false)} /></Dialog>
  </div>;
}
