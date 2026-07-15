'use client';

import { notFound } from 'next/navigation';
import {
  MapPin,
  Phone,
  Mail,
  Plus,
  Pencil,
  MoreHorizontal,
  Activity,
  Clock,
  Server,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@crm-master/ui';
import { Badge } from '@crm-master/ui';
import { Button } from '@crm-master/ui';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

// ─── Mock data ─────────────────────────────────────────────

const clientMock = {
  name: 'Aerospace Dynamic Systems',
  initials: 'AD',
  location: 'Madrid, Spain (HQ)',
  phone: '+34 912 345 678',
  email: 'contact@ads-global.com',
  health: 'OPTIMAL',
  healthColor: 'text-[#10B981]',
  tags: ['ENTERPRISE', 'TECH CORE', '24/7 PRIORITY'],
  logoBg: 'bg-[#0F172A]',
};

const liveMetrics = [
  { label: 'Cloud Infrastructure', value: '99.98%', progress: 100, color: 'bg-[#10B981]' },
  { label: 'Database Sync', value: '64.2%', progress: 64, color: 'bg-[#F59E0B]' },
];

const timeline = [
  {
    icon: CheckCircle2,
    iconClass: 'text-[#10B981] bg-[#D1FAE5]',
    title: 'Kernel Patch Applied',
    desc: 'Security patch v2.4.1 deployed to production environment.',
    time: '10:45 AM',
  },
  {
    icon: AlertTriangle,
    iconClass: 'text-[#EF4444] bg-[#FEE2E2]',
    title: 'Error: Connection Timeout',
    desc: 'Database connection timeout on replica-3. Auto-recovery initiated.',
    time: '08:12 AM',
  },
  {
    icon: Activity,
    iconClass: 'text-[#45464D] bg-[#F0EDEF]',
    title: 'Manual Sync Initiated',
    desc: 'Full sync requested by admin for client inventory data.',
    time: 'Yesterday',
  },
  {
    icon: CheckCircle2,
    iconClass: 'text-[#10B981] bg-[#D1FAE5]',
    title: 'SSL Certificate Renewed',
    desc: 'Wildcard SSL cert for *.ads-global.com renewed (expires 2027).',
    time: 'Yesterday',
  },
];

const systemsData = [
  { name: 'BeeHive CRM', version: 'v3.2.1', status: 'active', health: 96 },
  { name: 'Payment Gateway', version: 'v2.0.4', status: 'warning', health: 72 },
  { name: 'Analytics Engine', version: 'v1.8.0', status: 'critical', health: 34 },
];

const inventoryItems = [
  { name: 'Contact Management', status: 'Implemented' as const },
  { name: 'Invoice Automation', status: 'Implemented' as const },
  { name: 'Calendar Sync', status: 'Partial' as const },
  { name: 'AI Lead Scoring', status: 'Planned' as const },
  { name: 'Multi-language', status: 'Planned' as const },
];

const tasksMock = [
  { title: 'Upgrade database cluster', priority: 'High', due: 'Jul 5', status: 'pending' as const },
  { title: 'Review API rate limits', priority: 'Medium', due: 'Jul 8', status: 'in_progress' as const },
  { title: 'SSL cert renewal reminder', priority: 'Low', due: 'Aug 1', status: 'done' as const },
];

// ─── Components ────────────────────────────────────────────

function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

// ─── Page ──────────────────────────────────────────────────

import { use } from 'react';

export default function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  // TODO: fetch real client data
  if (!params.id) notFound();

  const c = clientMock;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
        <Link href="/clients" className="hover:text-[#1B1B1D]">
          Clients
        </Link>
        <span>/</span>
        <span className="text-[#1B1B1D]">{c.name.toUpperCase()}</span>
      </div>

      {/* Client Header Card */}
      <Card className="bg-white">
        <CardContent className="flex items-start gap-6 p-5">
          {/* Logo */}
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-[0.5rem] ${c.logoBg}`}
          >
            <span className="text-2xl font-bold text-white">{c.initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <h1 className="text-[24px] font-semibold leading-tight text-[#1B1B1D]">
              {c.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[#45464D]">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {c.location}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {c.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {c.email}
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {c.tags.map((tag) => (
                <Badge key={tag} variant="default" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[#10B981]">
                <StatusDot color="bg-[#10B981]" />
                HEALTH: {c.health}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5 bg-[#0F172A] text-xs text-white">
                <Plus className="h-3.5 w-3.5" />
                New Intervention
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Activity Log</DropdownMenuItem>
                  <DropdownMenuItem>Generate Report</DropdownMenuItem>
                  <DropdownMenuItem className="text-[#EF4444]">Archive Client</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-[#E2E8F0] bg-transparent p-0">
          {['SUMMARY', 'SYSTEMS', 'INVENTORY', 'BITÁCORA', 'TASKS'].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab.toLowerCase()}
              className="rounded-none border-b-2 border-transparent px-4 py-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#45464D] data-[state=active]:border-[#0F172A] data-[state=active]:bg-transparent data-[state=active]:text-[#1B1B1D] data-[state=active]:shadow-none"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── SUMMARY ── */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Live Monitoring */}
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                  Live Monitoring
                </CardTitle>
                <span className="flex items-center gap-1 text-[11px] font-medium text-[#10B981]">
                  <StatusDot color="bg-[#10B981]" /> ONLINE
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveMetrics.map((m) => (
                  <div key={m.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-[#45464D]">{m.label}</span>
                      <span className="font-semibold text-[#1B1B1D]">{m.value}</span>
                    </div>
                    <Progress value={m.progress} indicatorClass={m.color} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Bitácora / Timeline */}
            <Card className="bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                    Bitácora
                  </CardTitle>
                  <button className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#0F172A] hover:underline">
                    Full Log
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {timeline.map((event, i) => (
                  <div key={i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-px bg-[#E2E8F0]" />
                    )}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${event.iconClass}`}
                    >
                      <event.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-[#1B1B1D]">{event.title}</p>
                        <span className="shrink-0 text-[11px] text-[#45464D]">{event.time}</span>
                      </div>
                      <p className="text-[12px] text-[#45464D]">{event.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* SLA / Health */}
            <Card className="border-l-4 border-l-[#10B981] bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                  SLA & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#45464D]">Uptime SLA</span>
                  <span className="font-semibold text-[#1B1B1D]">99.95%</span>
                </div>
                <Progress value={99.95} indicatorClass="bg-[#10B981]" className="h-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-[#45464D]">Response Time</span>
                  <span className="font-semibold text-[#1B1B1D]">&lt; 200ms</span>
                </div>
                <Progress
                  value={85}
                  indicatorClass="bg-[#F59E0B]"
                  className="h-1.5"
                />
                <Button variant="outline" size="sm" className="mt-2 w-full text-xs">
                  View Full Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SYSTEMS ── */}
        <TabsContent value="systems" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-0">
              {systemsData.map((sys, i) => (
                <div
                  key={sys.name}
                  className={`flex items-center gap-4 p-4 ${i < systemsData.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
                >
                  <StatusDot
                    color={
                      sys.status === 'active'
                        ? 'bg-[#10B981]'
                        : sys.status === 'warning'
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#EF4444]'
                    }
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1B1B1D]">{sys.name}</p>
                    <p className="text-xs text-[#45464D]">{sys.version}</p>
                  </div>
                  <div className="w-32">
                    <Progress value={sys.health} indicatorClass="bg-[#10B981]" className="h-1.5" />
                  </div>
                  <span className="text-xs font-medium text-[#45464D]">{sys.health}%</span>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Details
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── INVENTORY ── */}
        <TabsContent value="inventory" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-0">
              {inventoryItems.map((item, i) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-3 p-4 ${i < inventoryItems.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
                >
                  {item.status === 'Implemented' ? (
                    <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                  ) : item.status === 'Partial' ? (
                    <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                  ) : (
                    <Clock className="h-5 w-5 text-[#C6C6CD]" />
                  )}
                  <span className="flex-1 text-sm text-[#1B1B1D]">{item.name}</span>
                  <Badge
                    variant={
                      item.status === 'Implemented'
                        ? 'success'
                        : item.status === 'Partial'
                          ? 'warning'
                          : 'default'
                    }
                    className="text-[10px]"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BITÁCORA ── */}
        <TabsContent value="bitácora" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-5">
              {timeline.map((event, i) => (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < timeline.length - 1 && (
                    <div className="absolute left-[18px] top-10 h-full w-px bg-[#E2E8F0]" />
                  )}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${event.iconClass}`}
                  >
                    <event.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1B1B1D]">{event.title}</p>
                      <span className="text-xs text-[#45464D]">{event.time}</span>
                    </div>
                    <p className="text-sm text-[#45464D]">{event.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TASKS ── */}
        <TabsContent value="tasks" className="mt-4">
          <Card className="bg-white">
            <CardContent className="p-0">
              {tasksMock.map((task, i) => (
                <div
                  key={task.title}
                  className={`flex items-center gap-3 p-4 ${i < tasksMock.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      task.status === 'done'
                        ? 'border-[#10B981] bg-[#10B981]'
                        : task.status === 'in_progress'
                          ? 'border-[#F59E0B]'
                          : 'border-[#C6C6CD]'
                    }`}
                  >
                    {task.status === 'done' && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  <span
                    className={`flex-1 text-sm ${
                      task.status === 'done'
                        ? 'text-[#45464D] line-through'
                        : 'text-[#1B1B1D]'
                    }`}
                  >
                    {task.title}
                  </span>
                  <Badge
                    variant={
                      task.priority === 'High'
                        ? 'critical'
                        : task.priority === 'Medium'
                          ? 'warning'
                          : 'default'
                    }
                    className="text-[10px]"
                  >
                    {task.priority}
                  </Badge>
                  <span className="text-xs text-[#45464D]">{task.due}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
