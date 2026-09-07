'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAnnouncements } from '@/hooks/use-announcements';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/foundation/page-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';

function SummaryCard({ label, value, detail, href }: { label: string; value: number; detail?: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-[#E2E8F0] bg-white p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#45464D]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#1B1B1D]">{value}</p>
      {detail ? <p className="mt-1 text-sm text-[#45464D]">{detail}</p> : null}
    </Link>
  );
}

function LoadingOverview() {
  return <StatePanel state="loading" label="overview" title="Loading overview" />;
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const { announcements } = useAnnouncements();

  if (isLoading) return <LoadingOverview />;
  if (isError) return <StatePanel state="error" title="Unable to load overview" description="Try again to refresh the dashboard." onRetry={refetch} />;
  if (!data) return <StatePanel state="empty" title="No overview data yet" description="Overview information will appear when it is available." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="A concise view of the work that needs attention." action={<Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />

      <section aria-label="Attention" className="space-y-3">
        <h2 className="text-base font-semibold text-[#1B1B1D]">Attention</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard label="Open tasks" value={data.tareasPendientes} href="/admin/tareas" />
          <SummaryCard label="Appointments pending" value={data.citasPendientes} href="/admin/calendario" />
        </div>
      </section>

      <section aria-label="Summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Active clients" value={data.clientesActivos} detail={`of ${data.totalClientes} total`} href="/admin/clientes" />
        <SummaryCard label="Appointments today" value={data.citasHoy} href="/admin/calendario" />
        <SummaryCard label="Active systems" value={data.sistemasActivos} href="/admin/sistemas" />
      </section>

      {announcements.length > 0 ? <section aria-label="Announcements" className="space-y-2"><h2 className="text-base font-semibold text-[#1B1B1D]">Announcements</h2>{announcements.map((announcement) => <Card key={announcement.id}><CardContent className="p-4"><p className="text-sm text-[#1B1B1D]">{announcement.message}</p></CardContent></Card>)}</section> : null}

      <section aria-label="Recent activity" className="space-y-3">
        <h2 className="text-base font-semibold text-[#1B1B1D]">Recent activity</h2>
        {data.eventosRecientes.length === 0 ? <StatePanel state="empty" title="No recent activity" /> : <div className="space-y-2">{data.eventosRecientes.slice(0, 5).map((event) => <Card key={event.id}><CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start"><StatusBadge status={event.tipo} label={event.tipo} /><div><p className="font-medium text-[#1B1B1D]">{event.titulo}</p>{event.descripcion ? <p className="text-sm text-[#45464D]">{event.descripcion}</p> : null}<time className="text-xs text-[#45464D]">{new Date(event.fecha).toLocaleDateString('es-ES')}</time></div></CardContent></Card>)}</div>}
      </section>
    </div>
  );
}
