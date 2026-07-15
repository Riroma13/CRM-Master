'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { ClienteForm } from '@/components/forms/cliente-form';
import { TareaForm } from '@/components/forms/tarea-form';
import { SistemaForm } from '@/components/forms/sistema-form';
import { ArrowLeft, Users, HardDrive, ClipboardList, FileText, Trash2, Edit3, Plus, Phone, Mail, Calendar, MessageSquare } from 'lucide-react';

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
  notasGenerales?: string;
  createdAt: string;
  sistemas: Array<{ id: string; nombreSistema: string; tipo: string; estadoTecnico: string; entorno?: string }>;
  tareas: Array<{ id: string; titulo: string; estado: string; prioridad: string; fechaLimite?: string }>;
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [cliente, setCliente] = useState<ClienteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showNewSistema, setShowNewSistema] = useState(false);
  const [showNewTarea, setShowNewTarea] = useState(false);
  const [documentos, setDocumentos] = useState<Array<{ id: string; filename: string; category: string }>>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [comms, setComms] = useState<any[]>([]);
  const [showCommForm, setShowCommForm] = useState(false);
  const [commTipo, setCommTipo] = useState('llamada');
  const [commTitulo, setCommTitulo] = useState('');
  const [commDesc, setCommDesc] = useState('');

  const fetchComms = useCallback(async () => {
    try {
      const data = await api.get<any[]>(`/api/v1/communications/${id}`, undefined, { auth: true });
      setComms(data);
    } catch { /* ignore */ }
  }, [id]);

  const handleCommSubmit = async () => {
    if (!commTitulo.trim()) return;
    try {
      await api.post(`/api/v1/communications/${id}`, { tipo: commTipo, titulo: commTitulo.trim(), descripcion: commDesc.trim() || undefined }, { auth: true });
      setShowCommForm(false); setCommTitulo(''); setCommDesc('');
      toast('success', 'Comunicación registrada');
      fetchComms();
    } catch { toast('error', 'Error al registrar'); }
  };

  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const data = await api.get<any[]>(`/api/v1/tenant/documentos?clienteId=${id}`, undefined, { auth: true });
      setDocumentos(data);
    } catch { /* ignore */ } finally {
      setDocsLoading(false);
    }
  }, [id]);

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
  useEffect(() => { if (cliente) { fetchDocs(); fetchComms(); } }, [cliente?.id]);

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/api/v1/tenant/clientes/${id}`, { auth: true });
      toast('success', 'Cliente eliminado');
      router.push('/admin/clientes');
    } catch { toast('error', 'Error al eliminar cliente'); }
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

          {(cliente as any).notasGenerales && (
            <div className="mt-4 border-t border-[#E2E8F0] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D] mb-2">Notas internas</p>
              <p className="text-[13px] text-[#1B1B1D] whitespace-pre-wrap">{(cliente as any).notasGenerales}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Systems */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-[#45464D]" />
              <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Sistemas ({cliente.sistemas.length})</h2>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNewSistema(true)}>
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </Button>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#45464D]" />
              <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Tareas ({cliente.tareas.length})</h2>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNewTarea(true)}>
              <Plus className="h-3.5 w-3.5" /> Nueva
            </Button>
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

      {/* Documentos */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-[#45464D]" />
            <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Documentos ({documentos.length})</h2>
          </div>
          {docsLoading ? (
            <div className="h-12 animate-pulse rounded bg-[#F0EDEF]" />
          ) : documentos.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-[#45464D]">Sin documentos vinculados</p>
          ) : (
            <div className="space-y-2">
              {documentos.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-[0.25rem] border border-[#E2E8F0] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#45464D]" />
                    <p className="text-[13px] font-medium text-[#1B1B1D]">{d.filename}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline / Comunicaciones */}
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#45464D]" />
              <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Timeline</h2>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowCommForm(true)}>
              <Plus className="h-3.5 w-3.5" /> Registrar comunicación
            </Button>
          </div>

          {comms.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-[#45464D]">Sin actividad registrada</p>
          ) : (
            <div className="space-y-3">
              {comms.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 rounded-[0.25rem] border border-[#E2E8F0] bg-white p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    c.tipo === 'llamada' ? 'bg-[#DAE2FD]' : c.tipo === 'email' ? 'bg-[#D1FAE5]' : c.tipo === 'reunion' ? 'bg-[#FEF3C7]' : 'bg-[#F0EDEF]'
                  }`}>
                    {c.tipo === 'llamada' ? <Phone className="h-4 w-4 text-[#131B2E]" /> :
                     c.tipo === 'email' ? <Mail className="h-4 w-4 text-[#10B981]" /> :
                     c.tipo === 'reunion' ? <Calendar className="h-4 w-4 text-[#F59E0B]" /> :
                     <MessageSquare className="h-4 w-4 text-[#45464D]" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">{c.tipo}</span>
                      <span className="text-[13px] font-medium text-[#1B1B1D]">{c.titulo}</span>
                    </div>
                    {c.descripcion && <p className="text-[12px] text-[#45464D] mt-0.5">{c.descripcion}</p>}
                    <p className="text-[10px] text-[#45464D] mt-1">{new Date(c.createdAt).toLocaleString('es-ES')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Register communication dialog */}
      <Dialog open={showCommForm} onClose={() => setShowCommForm(false)} title="Registrar comunicación">
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Tipo</label>
            <select value={commTipo} onChange={(e) => setCommTipo(e.target.value)}
              className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D]">
              <option value="llamada">Llamada</option>
              <option value="email">Email</option>
              <option value="reunion">Reunión</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Título *</label>
            <Input value={commTitulo} onChange={(e) => setCommTitulo(e.target.value)} placeholder="Ej: Llamada para revisar presupuesto" className="mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Descripción</label>
            <textarea value={commDesc} onChange={(e) => setCommDesc(e.target.value)} placeholder="Detalles de la interacción..." rows={3}
              className="mt-1 block w-full rounded-[0.25rem] border border-[#E2E8F0] bg-white px-3 py-2 text-[13px] text-[#1B1B1D] resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowCommForm(false)}>Cancelar</Button>
            <Button size="sm" className="bg-[#131B2E] text-xs text-white" onClick={handleCommSubmit} disabled={!commTitulo.trim()}>Guardar</Button>
          </div>
        </div>
      </Dialog>

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
            notasGenerales: cliente.notasGenerales ?? '',
          }}
          onSuccess={() => { setShowForm(false); fetch(); toast('success', 'Cliente actualizado'); }}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>

      {/* New system dialog */}
      <Dialog open={showNewSistema} onClose={() => setShowNewSistema(false)} title="Nuevo sistema">
        <SistemaForm
          initial={{ clienteId: cliente.id, nombreSistema: '', tipo: '', entorno: 'Producción', version: '' }}
          onSuccess={() => { setShowNewSistema(false); fetch(); toast('success', 'Sistema creado'); }}
          onCancel={() => setShowNewSistema(false)}
        />
      </Dialog>

      {/* New task dialog */}
      <Dialog open={showNewTarea} onClose={() => setShowNewTarea(false)} title="Nueva tarea">
        <TareaForm
          clienteId={cliente.id}
          onSuccess={() => { setShowNewTarea(false); fetch(); toast('success', 'Tarea creada'); }}
          onCancel={() => setShowNewTarea(false)}
        />
      </Dialog>
    </div>
  );
}
