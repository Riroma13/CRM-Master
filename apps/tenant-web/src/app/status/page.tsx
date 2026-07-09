'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, Clock } from 'lucide-react';

interface HealthStatus {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks: Record<string, string>;
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          setHealth(await res.json());
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusIcon = (s: string) => {
    if (s === 'ok') return <CheckCircle className="h-5 w-5 text-[#10B981]" />;
    if (s === 'error') return <XCircle className="h-5 w-5 text-[#EF4444]" />;
    return <HelpCircle className="h-5 w-5 text-[#F59E0B]" />;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#0F172A]">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <h1 className="text-[20px] font-semibold text-[#1B1B1D]">CRM-Master</h1>
          <p className="text-[13px] text-[#45464D]">Estado del sistema</p>
        </div>

        <div className="rounded-[0.5rem] border border-[#E2E8F0] bg-white p-6 shadow-ambient space-y-4">
          {error ? (
            <div className="flex items-center gap-3 text-[#EF4444]">
              <XCircle className="h-5 w-5" />
              <p className="text-[13px] font-medium">No se puede conectar con el servidor</p>
            </div>
          ) : !health ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-[#F0EDEF]" />)}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#1B1B1D]">Estado general</span>
                <span className={`flex items-center gap-1.5 text-[13px] font-medium ${
                  health.status === 'ok' ? 'text-[#10B981]' : 'text-[#EF4444]'
                }`}>
                  {health.status === 'ok' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {health.status === 'ok' ? 'Operativo' : 'Degradado'}
                </span>
              </div>

              <hr className="border-[#E2E8F0]" />

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#45464D]">Versión</span>
                <span className="font-medium text-[#1B1B1D]">{health.version}</span>
              </div>

              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#45464D]">Tiempo activo</span>
                <span className="flex items-center gap-1 font-medium text-[#1B1B1D]">
                  <Clock className="h-3.5 w-3.5 text-[#45464D]" />
                  {formatUptime(health.uptime)}
                </span>
              </div>

              <hr className="border-[#E2E8F0]" />

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Servicios</p>
                {Object.entries(health.checks).map(([name, status]) => (
                  <div key={name} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#45464D] capitalize">{name}</span>
                    <span className="flex items-center gap-1">
                      {statusIcon(status)}
                      <span className={
                        status === 'ok' ? 'text-[#10B981]' : status === 'error' ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                      }>
                        {status === 'ok' ? 'Conectado' : status === 'error' ? 'Error' : 'No disponible'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <hr className="border-[#E2E8F0]" />

              <p className="text-[11px] text-[#45464D] text-center">
                Última actualización: {new Date(health.timestamp).toLocaleString('es-ES')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
