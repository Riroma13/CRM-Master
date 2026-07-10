'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Download, RefreshCw } from 'lucide-react';

export default function ReportesPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState('30');

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const d = await api.get<any>('/api/v1/tenant/dashboard', undefined, { auth: true });
      setData(d);
    } catch {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const downloadCsv = () => {
    window.open('/api/v1/export/clientes/csv', '_blank');
  };

  const downloadJson = () => {
    window.open('/api/v1/export/all/json', '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Reportes</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-24 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Reportes</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Clientes</p>
            <p className="text-[30px] font-bold text-[#1B1B1D]">{data?.totalClientes ?? 0}</p>
            <p className="text-[12px] text-[#45464D]">{data?.clientesActivos ?? 0} activos</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Citas</p>
            <p className="text-[30px] font-bold text-[#1B1B1D]">{data?.citasHoy ?? 0}</p>
            <p className="text-[12px] text-[#45464D]">hoy · {data?.citasPendientes ?? 0} pendientes</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Tareas</p>
            <p className="text-[30px] font-bold text-[#1B1B1D]">{data?.tareasPendientes ?? 0}</p>
            <p className="text-[12px] text-[#45464D]">pendientes</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Sistemas</p>
            <p className="text-[30px] font-bold text-[#1B1B1D]">{data?.sistemasActivos ?? 0}</p>
            <p className="text-[12px] text-[#45464D]">activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Export */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-4 w-4 text-[#45464D]" />
            <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Exportar datos</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="gap-1" onClick={downloadCsv}>
              <Download className="h-3.5 w-3.5" /> Exportar clientes (CSV)
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={downloadJson}>
              <Download className="h-3.5 w-3.5" /> Exportar todo (JSON)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
