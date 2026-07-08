'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ClienteForm } from '@/components/forms/cliente-form';
import { ArrowLeft, Users, HardDrive, ClipboardList, Trash2, Edit3 } from 'lucide-react';

const SALUD_COLORS: Record<string, string> = {
  '🟢': 'bg-[#D1FAE5] text-[#10B981]',
  '🟡': 'bg-[#FEF3C7] text-[#F59E0B]',
  '🔴': 'bg-[#FEE2E2] text-[#EF4444]',
};
const ESTADO_COLORS: Record<string, string> = {
  Activo: 'bg-[#D1FAE5] text-[#10B981]',
  'En pausa': 'bg-[#FEF3C7] text-[#F59E0B]',
  Cerrado: 'bg-[#F0EDEF] text-[#45464D]',
  Prospecto: 'bg-[#DAE2FD] text-[#131B2E]',
};

interface ClienteDetail {
  id: string;
  nombre: string;
  tipoNegocio?: string;
  estadoRelacion: string;
  saludGeneral: string;
  tags: string[];
  createdAt: string;
  sistemas: Array<{ id: string; nombreSistema: string; tipo: string; estadoTecnico: string; entorno?: string }>;
  tareas: Array<{ id: string; titulo: string; estado: string; prioridad: string; fechaLimite?: string }>;
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [cliente, setCliente] = useState<ClienteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetch = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await api.get<ClienteDetail>(`/api/v1/tenant/clientes/${id}`, undefined, { auth: true });
      setCliente(data);
    } catch (err) {
      setIsError(true);
      setErrorMsg(err instanceof Error ? err.message : 'Error al cargar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [id]);

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/api/v1/tenant/clientes/${id}`, { auth: true });
      router.push('/admin/clientes');
    } catch { /* ignore */ }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-[#F0EDEF]" />
        <div className="h-48 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white" />
      </div>
    );
  }

  if (isError || !cliente) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#EF4444]">Error al cargar cliente</p>
          <p className="text-xs text-[#45464D]">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={fetch} className="mt-2">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/clientes')} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowForm(true)}>
            <Edit3 className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-[#EF4444]" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[18px] font-semibold text-[#1B1B1D]">{cliente.nombre}</h1>
              {cliente.tipoNegocio && (
                <p className="text-[13px] text-[#45464D] mt-1">{cliente.tipoNegocio}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={SALUD_COLORS[cliente.saludGeneral] ?? ''}>
                {cliente.saludGeneral}
              </Badge>
              <Badge variant="outline" className={ESTADO_COLORS[cliente.estadoRelacion] ?? ''}>
                {cliente.estadoRelacion}
              </Badge>
            </div>
          </div>

          {cliente.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {cliente.tags.map((tag) => (
                <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          )}

          <p className="text-[11px] text-[#45464D]">
            Cliente desde {new Date(cliente.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
          </p>
        </CardContent>
      </Card>

      {/* Systems */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-4 w-4 text-[#45464D]" />
            <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Sistemas ({cliente.sistemas.length})</h2>
          </div>
          {cliente.sistemas.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-[#45464D]">Sin sistemas registrados</p>
          ) : (
            <div className="space-y-2">
              {cliente.sistemas.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-[0.25rem] border border-[#E2E8F0] bg-white p-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                  onClick={() => router.push(`/admin/sistemas/${s.id}`)}
                >
                  <div>
                    <p className="text-[13px] font-medium text-[#1B1B1D]">{s.nombreSistema}</p>
                    <p className="text-[11px] text-[#45464D]">{s.tipo}{s.entorno ? ` · ${s.entorno}` : ''}</p>
                  </div>
                  <Badge variant="outline" className={SALUD_COLORS[s.estadoTecnico] ?? ''}>{s.estadoTecnico}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tareas */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="h-4 w-4 text-[#45464D]" />
            <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Tareas ({cliente.tareas.length})</h2>
          </div>
          {cliente.tareas.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-[#45464D]">Sin tareas registradas</p>
          ) : (
            <div className="space-y-2">
              {cliente.tareas.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-[0.25rem] border border-[#E2E8F0] bg-white p-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#1B1B1D]">{t.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#45464D]">{t.estado}</span>
                      {t.fechaLimite && (
                        <span className="text-[11px] text-[#45464D]">· {new Date(t.fechaLimite).toLocaleDateString('es-ES')}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-[#FEF3C7] text-[#F59E0B]">{t.prioridad}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Editar cliente">
        <ClienteForm
          initial={{
            id: cliente.id,
            nombre: cliente.nombre,
            tipoNegocio: cliente.tipoNegocio ?? '',
            estadoRelacion: cliente.estadoRelacion,
            saludGeneral: cliente.saludGeneral,
            tags: cliente.tags.join(', '),
          }}
          onSuccess={() => { setShowForm(false); fetch(); }}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>
    </div>
  );
}
