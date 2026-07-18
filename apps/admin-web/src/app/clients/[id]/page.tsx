'use client';

import { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@crm-master/ui';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { ClienteDetail, EventoItem } from '@/lib/api-types';
import { ClientHeader } from './components/ClientHeader';
import { ClientTabs } from './components/ClientTabs';
import { TabResumen } from './components/TabResumen';
import { TabSistemas } from './components/TabSistemas';
import { TabInventario } from './components/TabInventario';
import { TabBitacora } from './components/TabBitacora';
import { TabTareas } from './components/TabTareas';
import { EventoForm } from './components/EventoForm';

export default function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const [client, setClient] = useState<ClienteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [refreshBitacora, setRefreshBitacora] = useState(0);

  useEffect(() => {
    if (!params.id) { setIsLoading(false); return; }
    setIsLoading(true);
    api.get<ClienteDetail>(`/api/v1/admin/clientes/${params.id}`)
      .then(setClient)
      .catch(() => setClient(null))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-[#45464D]">Cargando datos del cliente...</p>
      </div>
    );
  }

  if (!client) {
    notFound();
  }

  const handleEventoCreated = (_evento: EventoItem) => {
    setRefreshBitacora((n) => n + 1);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.05em] text-[#45464D]">
        <Link href="/clients" className="hover:text-[#1B1B1D]">
          Clients
        </Link>
        <span>/</span>
        <span className="text-[#1B1B1D]">{client.nombre.toUpperCase()}</span>
      </div>

      {/* Header */}
      <ClientHeader client={client} />

      {/* New Evento Button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="gap-1.5 bg-[#0F172A] text-xs text-white"
          onClick={() => setShowEventoForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New Evento
        </Button>
      </div>

      {/* Tabs */}
      <ClientTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'summary' && <TabResumen client={client} />}
      {activeTab === 'systems' && <TabSistemas sistemas={client.sistemas} />}
      {activeTab === 'inventory' && <TabInventario sistemas={client.sistemas} />}
      {activeTab === 'bitacora' && (
        <TabBitacora key={refreshBitacora} clienteId={client.id} />
      )}
      {activeTab === 'tasks' && <TabTareas clienteId={client.id} />}

      {/* Evento Form Modal */}
      {showEventoForm && (
        <EventoForm
          clienteId={client.id}
          sistemas={client.sistemas}
          onClose={() => setShowEventoForm(false)}
          onCreated={handleEventoCreated}
        />
      )}
    </div>
  );
}
