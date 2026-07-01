'use client';

import { CheckCircle2, AlertTriangle, ClipboardList, TrendingUp, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Filter, SlidersHorizontal } from 'lucide-react';

// ─── Mock data ─────────────────────────────────────────────

const kpis = [
  {
    label: 'ACTIVE CLIENTS',
    value: '124',
    sub: '+3%',
    subClass: 'text-[#10B981]',
    icon: CheckCircle2,
    iconClass: 'text-[#10B981] bg-[#D1FAE5]',
  },
  {
    label: 'SYSTEM ALERTS',
    value: '08',
    sub: 'Priority',
    subClass: 'text-[#EF4444]',
    icon: AlertTriangle,
    iconClass: 'text-[#EF4444] bg-[#FEE2E2]',
  },
  {
    label: 'PENDING TASKS',
    value: '42',
    sub: 'Due today',
    subClass: 'text-[#45464D]',
    icon: ClipboardList,
    iconClass: 'text-[#F59E0B] bg-[#FEF3C7]',
  },
  {
    label: 'OPERATIONAL HEALTH',
    value: '98.2%',
    sub: 'Stable',
    subClass: 'text-[#10B981]',
    icon: TrendingUp,
    iconClass: 'text-[#10B981] bg-[#D1FAE5]',
  },
];

const clients = [
  {
    id: 'C-001',
    name: 'Aura Logistics',
    status: 'active' as const,
    health: 100,
    healthColor: 'bg-[#10B981]',
    systems: 3,
    incidents: '0',
    tags: ['TECH', 'SAAS'],
  },
  {
    id: 'C-002',
    name: 'Stellar Capital',
    status: 'active' as const,
    health: 100,
    healthColor: 'bg-[#10B981]',
    systems: 5,
    incidents: '0',
    tags: ['FINTECH', 'CRITICAL'],
  },
  {
    id: 'C-003',
    name: 'Horizon Health',
    status: 'warning' as const,
    health: 78,
    healthColor: 'bg-[#F59E0B]',
    systems: 2,
    incidents: '1 Low',
    tags: ['MEDICAL', 'CLOUD'],
  },
  {
    id: 'C-004',
    name: 'Apex Media',
    status: 'warning' as const,
    health: 65,
    healthColor: 'bg-[#F59E0B]',
    systems: 4,
    incidents: '2 High',
    tags: ['TECH'],
  },
  {
    id: 'C-005',
    name: 'GreenLeaf Energy',
    status: 'active' as const,
    health: 92,
    healthColor: 'bg-[#10B981]',
    systems: 2,
    incidents: '0',
    tags: ['GREEN TECH', 'STORAGE'],
  },
  {
    id: 'C-006',
    name: 'BlueWave Aquatech',
    status: 'critical' as const,
    health: 42,
    healthColor: 'bg-[#EF4444]',
    systems: 1,
    incidents: '3 High',
    tags: ['TECH', 'CRITICAL'],
  },
];

const statusColors = {
  active: 'bg-[#10B981]',
  warning: 'bg-[#F59E0B]',
  critical: 'bg-[#EF4444]',
} as const;

// ─── KPI Card ──────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  subClass,
  icon: Icon,
  iconClass,
}: (typeof kpis)[number]) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[30px] font-bold leading-none tracking-tight text-[#1B1B1D]">
              {value}
            </span>
            <span className={`text-[13px] font-medium ${subClass}`}>{sub}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Client Card ───────────────────────────────────────────

function ClientCard({
  name,
  id,
  status,
  health,
  healthColor,
  systems,
  incidents,
  tags,
}: (typeof clients)[number]) {
  return (
    <Card className="bg-white transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
            <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-6 w-6 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Open Control Center</DropdownMenuItem>
              <DropdownMenuItem>Edit Client</DropdownMenuItem>
              <DropdownMenuItem className="text-[#EF4444]">Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ID */}
        <p className="mb-2 text-[12px] text-[#45464D]">ID: #{id}</p>

        {/* Divider */}
        <div className="mb-3 border-t border-[#E2E8F0]" />

        {/* Stats row */}
        <div className="mb-3 flex items-center justify-between text-sm">
          <div>
            <span className="text-[#45464D]">Active Systems</span>
            <span className="ml-1 font-semibold text-[#1B1B1D]">{systems}</span>
          </div>
          <div>
            <span className="text-[#45464D]">Incidents</span>
            <span
              className={`ml-1 font-semibold ${
                incidents.includes('High')
                  ? 'text-[#EF4444]'
                  : incidents.includes('Low')
                    ? 'text-[#F59E0B]'
                    : 'text-[#1B1B1D]'
              }`}
            >
              {incidents || '0'}
            </span>
          </div>
        </div>

        {/* Health score */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-[#45464D]">Health Score</span>
            <span className="font-semibold text-[#1B1B1D]">{health}%</span>
          </div>
          <Progress value={health} className="h-1.5" indicatorClass={healthColor} />
        </div>

        {/* Tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="default" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Action */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs uppercase tracking-[0.05em]"
        >
          Open Control Center
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Empty card ────────────────────────────────────────────

function AddClientCard() {
  return (
    <Card className="flex min-h-[240px] items-center justify-center border-2 border-dashed border-[#C6C6CD] bg-white">
      <CardContent className="flex flex-col items-center gap-2 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[#C6C6CD]">
          <Plus className="h-5 w-5 text-[#45464D]" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
          Register New Client
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-[18px] font-semibold text-[#1B1B1D]">Mapa de Clientes</h2>
          <span className="rounded-[0.25rem] bg-[#F0EDEF] px-2 py-0.5 text-[11px] font-medium text-[#45464D]">
            LATEST_SYNC: 10:45 AM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Filter by Tag
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Health Status
          </Button>
          <Button size="sm" className="gap-1.5 bg-[#0F172A] text-xs text-white">
            <Plus className="h-3.5 w-3.5" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-3 gap-4">
        {clients.map((client) => (
          <ClientCard key={client.id} {...client} />
        ))}
        <AddClientCard />
      </div>

      {/* Pending Tasks Footer */}
      <Card className="bg-white">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-sm font-semibold text-[#1B1B1D]">Global Pending Tasks</h3>
            <p className="text-xs text-[#45464D]">42 tasks requiring attention</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            View All
          </Button>
        </CardContent>
      </Card>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 flex h-12 w-12 items-center justify-center rounded-full bg-[#0F172A] text-white shadow-lg transition-shadow hover:shadow-xl">
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
