'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import {
  Globe,
  Server,
  Terminal,
  RefreshCw,
  FileText,
  ArrowUpRight,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

// ─── Mock data ─────────────────────────────────────────────

const system = {
  name: 'System Core Alpha',
  status: 'OPERATIONAL / PRIMARY INSTANCE',
  statusColor: 'bg-[#10B981]',
  url: 'https://core.missioncontrol.net',
  server: 'VPS-AMS-042 — Ubuntu 22.04 LTS',
  version: 'v2.4.11-stable',
  lastRestart: '2 days ago',
};

const metrics = [
  { label: 'CPU LOAD', value: '12.4%', progress: 12, color: 'bg-[#0F172A]' },
  { label: 'MEMORY', value: '4.2 GB / 16 GB', progress: 26, color: 'bg-[#10B981]' },
  { label: 'UPTIME', value: '14d 06h 21m', meta: `Last restart: ${system.lastRestart}` },
];

const healthItems = [
  { label: 'SSL Certificate', status: 'valid', statusText: 'VALID', color: 'text-[#10B981]', icon: 'check' },
  { label: 'Database Sync', status: 'synced', statusText: 'SYNCED', color: 'text-[#10B981]', icon: 'check' },
  { label: 'Backups', status: 'stale', statusText: '48H OLD', color: 'text-[#F59E0B]', icon: 'warning' },
];

const modules = [
  { id: 'AUTH-GATEWAY-01', desc: 'Authentication & SSO Gateway', category: 'SECURITY', version: 'v1.2.4', status: 'active' as const, latency: '12ms' },
  { id: 'DB-CLUSTER-03', desc: 'PostgreSQL replica cluster', category: 'DATA', version: 'v3.0.1', status: 'active' as const, latency: '4ms' },
  { id: 'CACHE-NODE-07', desc: 'Redis distributed cache layer', category: 'DATA', version: 'v2.1.0', status: 'throttled' as const, latency: '89ms' },
  { id: 'API-EDGE-12', desc: 'Edge API Gateway (CDN)', category: 'NETWORK', version: 'v1.8.3', status: 'active' as const, latency: '23ms' },
  { id: 'LOG-ARCHIVE-02', desc: 'Centralized log aggregator', category: 'STORAGE', version: 'v0.9.4', status: 'incident' as const, latency: '1.2s' },
];

const timeline = [
  {
    icon: 'check',
    color: 'bg-[#10B981]',
    title: 'Kernel Patch Applied',
    desc: 'Security patch v2.4.1 deployed to production environment.',
    time: '10:45 AM',
  },
  {
    icon: 'error',
    color: 'bg-[#EF4444]',
    title: 'Error: Connection Timeout',
    desc: 'Database connection timeout on replica-3. Auto-recovery initiated.',
    time: '08:12 AM',
  },
  {
    icon: 'neutral',
    color: 'bg-[#45464D]',
    title: 'Manual Sync Initiated',
    desc: 'Full sync requested by admin for client inventory data.',
    time: 'Yesterday',
  },
];

function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function ModuleStatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[#10B981]',
    throttled: 'bg-[#F59E0B]',
    incident: 'bg-[#EF4444]',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || 'bg-[#C6C6CD]'}`} />;
}

const categoryPill: Record<string, string> = {
  SECURITY: 'bg-[#DAE2FD] text-[#0F172A]',
  DATA: 'bg-[#D1FAE5] text-[#065F46]',
  NETWORK: 'bg-[#FEF3C7] text-[#92400E]',
  STORAGE: 'bg-[#F0EDEF] text-[#45464D]',
  INTERFACE: 'bg-[#FFE4E6] text-[#991B1B]',
};

export default function SystemDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  if (!params.id) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
        <Link href="/inventory" className="hover:text-[#1B1B1D]">
          Infrastructure
        </Link>
        <span>/</span>
        <span className="text-[#1B1B1D]">Global Inventory Detail</span>
      </div>

      {/* Header — Status + Title + Metadata */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <StatusDot color={system.statusColor} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#10B981]">
            {system.status}
          </span>
        </div>
        <h1 className="text-[24px] font-semibold leading-tight text-[#1B1B1D]">{system.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="default" className="gap-1 text-[10px]">
            <Globe className="h-3 w-3" /> {system.url}
          </Badge>
          <Badge variant="default" className="gap-1 text-[10px]">
            <Server className="h-3 w-3" /> {system.server}
          </Badge>
          <Badge variant="default" className="gap-1 text-[10px]">
            <Terminal className="h-3 w-3" /> {system.version}
          </Badge>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-1.5 bg-[#0F172A] text-xs text-white">
          <RefreshCw className="h-3.5 w-3.5" />
          Force Sync
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" />
          Generate Report
        </Button>
      </div>

      {/* Metrics Row + Health Panel */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-white">
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                {m.label}
              </p>
              <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-[#1B1B1D]">
                {m.value.split('/')[0].trim()}
              </p>
              {m.progress !== undefined && (
                <Progress value={m.progress} indicatorClass={m.color} className="mt-2 h-1.5" />
              )}
              {m.meta && (
                <p className="mt-1 text-[11px] text-[#45464D]">{m.meta}</p>
              )}
              {m.value.includes('/') && (
                <p className="text-[13px] text-[#45464D]">/ {m.value.split('/')[1].trim()}</p>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Instance Health Panel — Dark */}
        <Card className="border-0 bg-[#0F172A]">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-white/70">
              Instance Health
            </p>
            <div className="mt-3 space-y-2.5">
              {healthItems.map((h) => (
                <div key={h.label} className="flex items-center justify-between">
                  <span className="text-[13px] text-white/80">{h.label}</span>
                  <span className={`flex items-center gap-1 text-[11px] font-semibold ${h.color}`}>
                    {h.icon === 'check' ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )}
                    {h.statusText}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full bg-white/10 text-xs text-white hover:bg-white/20"
            >
              Access Console
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-[16px] font-semibold">Global Inventory Matrix</CardTitle>
            <div className="flex gap-1">
              {['All Modules', 'Core Systems', 'Client Integrations', 'Security Nodes'].map(
                (tab, i) => (
                  <button
                    key={tab}
                    className={`rounded-[0.25rem] px-2.5 py-1 text-[11px] font-medium ${
                      i === 0
                        ? 'bg-[#0F172A] text-white'
                        : 'text-[#45464D] hover:bg-[#F0EDEF]'
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
            <Input
              placeholder="Filter inventory..."
              className="h-8 bg-[#F8FAFC] pl-9 text-xs"
            />
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MODULE ID</TableHead>
              <TableHead>DESCRIPTION</TableHead>
              <TableHead>CATEGORY</TableHead>
              <TableHead>VERSION</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>LATENCY</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((mod, i) => (
              <TableRow key={mod.id} className={i % 2 === 1 ? 'bg-[#F8FAFC]' : ''}>
                <TableCell>
                  <span className="font-mono text-xs text-[#1B1B1D]">{mod.id}</span>
                </TableCell>
                <TableCell className="text-[13px] text-[#1B1B1D]">{mod.desc}</TableCell>
                <TableCell>
                  <span
                    className={`inline-block rounded-[0.25rem] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] ${
                      categoryPill[mod.category] || 'bg-[#F0EDEF] text-[#45464D]'
                    }`}
                  >
                    {mod.category}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-[#45464D]">{mod.version}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <ModuleStatusDot status={mod.status} />
                    <span
                      className={`text-xs font-medium capitalize ${
                        mod.status === 'active'
                          ? 'text-[#10B981]'
                          : mod.status === 'throttled'
                            ? 'text-[#F59E0B]'
                            : 'text-[#EF4444]'
                      }`}
                    >
                      {mod.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className={`font-mono text-xs ${
                    mod.latency.includes('s')
                      ? 'text-[#EF4444]'
                      : parseInt(mod.latency) > 50
                        ? 'text-[#F59E0B]'
                        : 'text-[#1B1B1D]'
                  }`}
                >
                  {mod.latency}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-6 w-6 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF]">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Restart Module</DropdownMenuItem>
                      <DropdownMenuItem className="text-[#EF4444]">Disable</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3">
          <p className="text-xs text-[#45464D]">Showing 5 of 124 components</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, '...', 25].map((page, i) => (
              <button
                key={i}
                className={`flex h-7 w-7 items-center justify-center rounded-[0.25rem] text-xs font-medium ${
                  page === 1
                    ? 'bg-[#0F172A] text-white'
                    : 'text-[#45464D] hover:bg-[#F0EDEF]'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bottom: Bitácora + Traffic Topology */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bitácora */}
        <Card className="bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              System Bitácora
            </CardTitle>
            <button className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#0F172A] hover:underline">
              Full Log
            </button>
          </CardHeader>
          <CardContent className="space-y-0">
            {timeline.map((event, i) => (
              <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                {i < timeline.length - 1 && (
                  <div className="absolute left-[11px] top-6 h-full w-px bg-[#E2E8F0]" />
                )}
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${event.color}`}>
                  {event.icon === 'check' ? (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : event.icon === 'error' ? (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-[#1B1B1D]">{event.title}</p>
                    <span className="shrink-0 text-[11px] text-[#45464D]">{event.time}</span>
                  </div>
                  <p className="text-xs text-[#45464D]">{event.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Traffic Topology */}
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Traffic Topology
            </CardTitle>
            <p className="text-xs text-[#45464D]">Visualizing packet routing across regional nodes</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topology mini-map placeholder */}
            <div className="flex items-center justify-center rounded-[0.375rem] border border-dashed border-[#C6C6CD] bg-[#F8FAFC] py-10">
              <div className="flex items-center gap-8">
                {['Client', 'Edge', 'API', 'DB'].map((label, i) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0EDEF]">
                      <span className="text-[10px] font-semibold text-[#45464D]">{label.charAt(0)}</span>
                    </div>
                    <span className="text-[10px] text-[#45464D]">{label}</span>
                    {i < 3 && (
                      <svg className="h-4 w-4 text-[#C6C6CD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stat boxes */}
            <div className="flex gap-4">
              <div className="flex-1 rounded-[0.25rem] border border-[#E2E8F0] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                  REQUESTS/SEC
                </p>
                <p className="text-[28px] font-bold leading-none text-[#1B1B1D]">1,402</p>
              </div>
              <div className="flex-1 rounded-[0.25rem] border border-[#E2E8F0] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                  ERROR RATE
                </p>
                <p className="text-[28px] font-bold leading-none text-[#10B981]">0.02%</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              View Interactive Map
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#0F172A] text-white shadow-lg transition-shadow hover:shadow-xl">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
