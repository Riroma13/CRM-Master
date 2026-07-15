'use client';

import {
  Download,
  Filter,
  Lightbulb,
  RefreshCcw,
  Globe,
  MoreHorizontal,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@crm-master/ui';
import { Badge } from '@crm-master/ui';
import { Button } from '@crm-master/ui';
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

// ─── Mock data ─────────────────────────────────────────────

type CellStatus = 'implemented' | 'partial' | 'planned';

interface MatrixRow {
  client: string;
  status: 'active' | 'warning' | 'critical';
  modules: Record<string, CellStatus>;
  coverage: number;
}

const moduleColumns = [
  'Contact Mgmt',
  'Invoice Auto',
  'Calendar Sync',
  'AI Lead Scoring',
  'Multi-language',
  'Analytics',
  'API Gateway',
];

const matrixData: MatrixRow[] = [
  {
    client: 'Aura Logistics',
    status: 'active',
    modules: {
      'Contact Mgmt': 'implemented',
      'Invoice Auto': 'implemented',
      'Calendar Sync': 'implemented',
      'AI Lead Scoring': 'partial',
      'Multi-language': 'planned',
      Analytics: 'implemented',
      'API Gateway': 'partial',
    },
    coverage: 71,
  },
  {
    client: 'Stellar Capital',
    status: 'active',
    modules: {
      'Contact Mgmt': 'implemented',
      'Invoice Auto': 'implemented',
      'Calendar Sync': 'implemented',
      'AI Lead Scoring': 'implemented',
      'Multi-language': 'planned',
      Analytics: 'implemented',
      'API Gateway': 'implemented',
    },
    coverage: 86,
  },
  {
    client: 'Horizon Health',
    status: 'warning',
    modules: {
      'Contact Mgmt': 'implemented',
      'Invoice Auto': 'partial',
      'Calendar Sync': 'partial',
      'AI Lead Scoring': 'planned',
      'Multi-language': 'planned',
      Analytics: 'implemented',
      'API Gateway': 'planned',
    },
    coverage: 43,
  },
  {
    client: 'Apex Media',
    status: 'warning',
    modules: {
      'Contact Mgmt': 'implemented',
      'Invoice Auto': 'implemented',
      'Calendar Sync': 'partial',
      'AI Lead Scoring': 'planned',
      'Multi-language': 'implemented',
      Analytics: 'implemented',
      'API Gateway': 'implemented',
    },
    coverage: 71,
  },
  {
    client: 'GreenLeaf Energy',
    status: 'active',
    modules: {
      'Contact Mgmt': 'implemented',
      'Invoice Auto': 'partial',
      'Calendar Sync': 'implemented',
      'AI Lead Scoring': 'planned',
      'Multi-language': 'planned',
      Analytics: 'partial',
      'API Gateway': 'planned',
    },
    coverage: 43,
  },
  {
    client: 'BlueWave Aquatech',
    status: 'critical',
    modules: {
      'Contact Mgmt': 'implemented',
      'Invoice Auto': 'planned',
      'Calendar Sync': 'planned',
      'AI Lead Scoring': 'planned',
      'Multi-language': 'planned',
      Analytics: 'implemented',
      'API Gateway': 'planned',
    },
    coverage: 29,
  },
];

const insightsCards = [
  {
    icon: Lightbulb,
    iconBg: 'bg-[#FEF3C7]',
    iconColor: 'text-[#F59E0B]',
    title: 'Common Gap Analysis',
    desc: 'AI Lead Scoring and Multi-language are the most commonly missing modules across clients.',
    action: 'View Full Report',
    progress: 12,
    progressLabel: '12% Avg. Adoption',
    progressColor: 'bg-[#F59E0B]',
  },
  {
    icon: RefreshCcw,
    iconBg: 'bg-[#D1FAE5]',
    iconColor: 'text-[#10B981]',
    title: 'Update Queue',
    desc: '3 clients have pending updates for Invoice Automation. Batch deploy available.',
    action: 'View Update Queue',
  },
  {
    icon: Globe,
    iconBg: 'bg-[#DAE2FD]',
    iconColor: 'text-[#0F172A]',
    title: 'Regional Distribution',
    desc: 'NA',
    action: 'View on Map',
    isRegional: true,
    regionalBars: [
      { label: 'NA', value: 12 },
      { label: 'EU', value: 8 },
      { label: 'LATAM', value: 4 },
      { label: 'APAC', value: 2 },
    ],
  },
];

// ─── Cell icon ─────────────────────────────────────────────

function CellIcon({ status }: { status: CellStatus }) {
  if (status === 'implemented')
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]">
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  if (status === 'partial')
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <svg className="h-3.5 w-3.5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01" />
        </svg>
      </span>
    );
  return (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#C6C6CD]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#C6C6CD]" />
    </span>
  );
}

// ─── Client status dot ─────────────────────────────────────

function StatusDot({ status }: { status: MatrixRow['status'] }) {
  const colors = { active: 'bg-[#10B981]', warning: 'bg-[#F59E0B]', critical: 'bg-[#EF4444]' };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />;
}

// ─── Regional bar ──────────────────────────────────────────

function RegionalBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-[11px] font-semibold uppercase text-[#45464D]">{label}</span>
      <div className="flex-1">
        <div className="h-5 w-full rounded-[0.25rem] bg-[#F0EDEF]">
          <div
            className="h-full rounded-[0.25rem] bg-[#0F172A] transition-all"
            style={{ width: `${(value / max) * 100}%` }}
          />
        </div>
      </div>
      <span className="w-6 text-right text-xs font-medium text-[#1B1B1D]">{value}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default function InventoryPage() {
  const maxRegional = Math.max(...(insightsCards[2] as any).regionalBars.map((b: any) => b.value));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
        <span>System</span>
        <span>/</span>
        <span className="text-[#1B1B1D]">Global Inventory Matrix</span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                TOTAL CLIENTS
              </p>
              <span className="text-[30px] font-bold leading-none tracking-tight text-[#1B1B1D]">
                42
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                MODULES TRACKED
              </p>
              <span className="text-[30px] font-bold leading-none tracking-tight text-[#1B1B1D]">
                7
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                AVG COVERAGE
              </p>
              <span className="text-[30px] font-bold leading-none tracking-tight text-[#1B1B1D]">
                57%
              </span>
              <Progress value={57} indicatorClass="bg-[#F59E0B]" className="mt-2 h-1.5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                IMPLEMENTED
              </p>
              <span className="text-[30px] font-bold leading-none tracking-tight text-[#1B1B1D]">
                78.4%
              </span>
              <Progress value={78} indicatorClass="bg-[#10B981]" className="mt-2 h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matrix Card */}
      <Card className="bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-4">
            <CardTitle className="text-[16px] font-semibold">
              Cross-Implementation Matrix
            </CardTitle>
            {/* Legend */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-[#45464D]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Implemented
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#45464D]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Partial
              </span>
              <span className="flex items-center gap-1 text-[11px] text-[#45464D]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C6C6CD]" /> Planned
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Filter View
            </Button>
            <Button size="sm" className="gap-1.5 bg-[#0F172A] text-xs text-white">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>

        {/* Search */}
        <div className="border-b border-[#E2E8F0] px-4 py-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
            <Input
              placeholder="Search matrix..."
              className="h-8 bg-[#F8FAFC] pl-9 text-xs"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">
                <div className="flex items-center gap-1">
                  CLIENT <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              {moduleColumns.map((mod) => (
                <TableHead key={mod} className="text-center">
                  <span className="text-[10px]">{mod.toUpperCase()}</span>
                </TableHead>
              ))}
              <TableHead className="text-right">COVERAGE</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrixData.map((row, i) => (
              <TableRow key={row.client} className={i % 2 === 1 ? 'bg-[#F8FAFC]' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusDot status={row.status} />
                    <span className="text-sm font-medium text-[#1B1B1D]">{row.client}</span>
                  </div>
                </TableCell>
                {moduleColumns.map((mod) => (
                  <TableCell key={mod} className="text-center">
                    <div className="flex justify-center">
                      <CellIcon status={row.modules[mod] || 'planned'} />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Progress
                      value={row.coverage}
                      indicatorClass={
                        row.coverage >= 70
                          ? 'bg-[#10B981]'
                          : row.coverage >= 40
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#EF4444]'
                      }
                      className="h-1.5 w-16"
                    />
                    <span className="text-xs font-medium text-[#45464D]">{row.coverage}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-6 w-6 items-center justify-center rounded-[0.25rem] text-[#45464D] hover:bg-[#F0EDEF]">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Client</DropdownMenuItem>
                      <DropdownMenuItem>Edit Modules</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3">
          <p className="text-xs text-[#45464D]">Showing 6 of 42 Clients</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, '...', 9].map((page, i) => (
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

      {/* Insight Cards */}
      <div className="grid grid-cols-3 gap-4">
        {insightsCards.map((card, i) => {
          const Icon = card.icon;
          if (card.isRegional) {
            const regional = card as any;
            return (
              <Card key={i} className="flex flex-col bg-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${card.iconBg}`}>
                      <Icon className={`h-4 w-4 ${card.iconColor}`} />
                    </div>
                    <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {regional.regionalBars.map((bar: any) => (
                    <RegionalBar key={bar.label} {...bar} max={maxRegional} />
                  ))}
                  <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
                    {card.action}
                  </Button>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={i} className="flex flex-col bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${card.iconBg}`}>
                    <Icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                  <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-xs leading-relaxed text-[#45464D]">{card.desc}</p>
                {card.progress !== undefined && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[#45464D]">AI Engine Adoption</span>
                      <span className="font-semibold text-[#1B1B1D]">{card.progress}%</span>
                    </div>
                    <Progress value={card.progress} indicatorClass={card.progressColor} className="h-1.5" />
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full text-xs">
                  {card.action}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
