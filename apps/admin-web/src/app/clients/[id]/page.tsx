'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { ClienteDetail } from '@/lib/api-types';
import { ClientHeader } from './components/ClientHeader';
import { ClientTabs } from './components/ClientTabs';
import { TabResumen } from './components/TabResumen';
import { TabSistemas } from './components/TabSistemas';
import { TabInventario } from './components/TabInventario';
import { TabBitacora } from './components/TabBitacora';
import { TabTareas } from './components/TabTareas';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ClientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const activeTab = searchParams.get('tab') || 'resumen';

  const [cliente, setCliente] = useState<ClienteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<ClienteDetail>(`/api/v1/admin/clientes/${id}`)
      .then(setCliente)
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Error al cargar el cliente',
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/clients/${id}?${params.toString()}`);
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#45464D]" />
          <p className="text-sm text-[#45464D]">Cargando cliente...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !cliente) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2]">
            <AlertCircle className="h-6 w-6 text-[#EF4444]" />
          </div>
          <p className="text-sm font-medium text-[#991B1B]">
            {error ?? 'Cliente no encontrado'}
          </p>
          <Link
            href="/clients"
            className="text-sm font-medium text-[#0F172A] underline underline-offset-2 hover:text-[#0F172A]/80"
          >
            Volver a clientes
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 hover:text-[#1B1B1D]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Clients
        </Link>
        <span>/</span>
        <span className="text-[#1B1B1D]">
          {cliente.nombre.toUpperCase()}
        </span>
      </div>

      {/* Client header */}
      <ClientHeader cliente={cliente} />

      {/* Tabs */}
      <ClientTabs />

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'resumen' && <TabResumen cliente={cliente} />}
        {activeTab === 'sistemas' && <TabSistemas cliente={cliente} />}
        {activeTab === 'inventario' && <TabInventario cliente={cliente} />}
        {activeTab === 'bitacora' && <TabBitacora clienteId={id} />}
        {activeTab === 'tareas' && <TabTareas clienteId={id} />}
      </div>
    </div>
  );
}
