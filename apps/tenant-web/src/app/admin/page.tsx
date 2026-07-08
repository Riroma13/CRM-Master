'use client';

import { useDashboard } from '@/hooks/use-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  Clock,
  ClipboardList,
  HardDrive,
  RefreshCw,
} from 'lucide-react';

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtitle?: string;
  color?: string;
}

function KpiCard({ icon: Icon, label, value, subtitle, color }: KpiCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-start gap-3 p-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            color ? `bg-${color}/10 text-${color}` : 'bg-[#F0EDEF] text-[#45464D]'
          }`}
        >
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
            {subtitle && (
              <span className="text-[13px] font-medium text-[#45464D]">{subtitle}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <div className="h-[100px] animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[#F0EDEF]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-[#F0EDEF]" />
          <div className="h-8 w-24 rounded bg-[#F0EDEF]" />
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#EF4444]">Error al cargar el dashboard</p>
          <p className="text-xs text-[#45464D]">{message}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

const TIPO_LABELS: Record<string, string> = {
  decision: 'Decisión',
  cambio_tecnico: 'Cambio técnico',
  incidencia: 'Incidencia',
  reunion: 'Reunión',
  aprendizaje: 'Aprendizaje',
};

const TIPO_COLORS: Record<string, string> = {
  decision: 'bg-[#DAE2FD] text-[#131B2E]',
  incidencia: 'bg-[#FEE2E2] text-[#EF4444]',
  reunion: 'bg-[#D1FAE5] text-[#10B981]',
  aprendizaje: 'bg-[#FEF3C7] text-[#F59E0B]',
};

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Dashboard</h1>
        </div>
        <ErrorBanner
          message={error?.message ?? 'Error desconocido'}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Dashboard</h1>
        <p className="py-8 text-center text-[13px] text-[#45464D]">
          No hay datos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Dashboard</h1>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 rounded-[0.25rem] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] hover:bg-[#F0EDEF]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          icon={Users}
          label="Clientes"
          value={data.clientesActivos}
          subtitle={`de ${data.totalClientes} totales`}
        />
        <KpiCard
          icon={Calendar}
          label="Citas hoy"
          value={data.citasHoy}
        />
        <KpiCard
          icon={Clock}
          label="Pendientes"
          value={data.citasPendientes}
        />
        <KpiCard
          icon={ClipboardList}
          label="Tareas"
          value={data.tareasPendientes}
          subtitle="pendientes"
        />
        <KpiCard
          icon={HardDrive}
          label="Sistemas"
          value={data.sistemasActivos}
          subtitle="activos"
        />
      </div>

      {/* Recent activity */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <h2 className="mb-4 text-[16px] font-semibold text-[#1B1B1D]">
            Actividad reciente
          </h2>
          {data.eventosRecientes.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-[#45464D]">
              No hay actividad reciente.
            </p>
          ) : (
            <div className="space-y-3">
              {data.eventosRecientes.map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-start gap-3 rounded-[0.25rem] border border-[#E2E8F0] bg-white p-3"
                >
                  <Badge
                    variant="outline"
                    className={
                      TIPO_COLORS[evento.tipo] ?? 'bg-[#F0EDEF] text-[#45464D]'
                    }
                  >
                    {TIPO_LABELS[evento.tipo] ?? evento.tipo}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[#1B1B1D]">
                      {evento.titulo}
                    </p>
                    {evento.descripcion && (
                      <p className="mt-0.5 text-[12px] text-[#45464D]">
                        {evento.descripcion}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-[#45464D]">
                      {new Date(evento.fecha).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
