'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTareas, TareaItem } from '@/hooks/use-tareas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { TareaForm } from '@/components/forms/tarea-form';
import { PageHeader } from '@/components/foundation/page-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';

function TaskRow({ task, onEdit, onAdvance, onBack }: { task: TareaItem; onEdit: () => void; onAdvance?: () => void; onBack?: () => void }) {
  return <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><Link href={`/admin/tareas/${task.id}`} className="font-medium text-[#0F172A] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]">{task.titulo}</Link>{task.cliente ? <p className="mt-1 text-sm text-[#45464D]">{task.cliente.nombre}</p> : null}{task.fechaLimite ? <time className="mt-1 block text-xs text-[#45464D]">Due {new Date(task.fechaLimite).toLocaleDateString('es-ES')}</time> : null}</div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={task.prioridad.toLowerCase()} label={task.prioridad} /><Button variant="ghost" size="sm" onClick={onEdit}>Edit</Button>{onBack ? <Button variant="ghost" size="sm" aria-label={`Move ${task.titulo} back`} onClick={onBack}>Back</Button> : null}{onAdvance ? <Button variant="ghost" size="sm" aria-label={`Move ${task.titulo} forward`} onClick={onAdvance}>Next</Button> : null}</div></CardContent></Card>;
}

export default function TareasPage() {
  const { toast } = useToast();
  const { tareas, isLoading, isError, refetch, updateTarea } = useTareas();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TareaItem | null>(null);
  const open = tareas.filter((task) => task.estado !== 'Hecho' && task.estado !== 'Cancelada');
  const completed = tareas.filter((task) => task.estado === 'Hecho');
  const advance = (task: TareaItem) => void updateTarea(task.id, { estado: task.estado === 'Pendiente' ? 'En curso' : 'Hecho' });
  const back = (task: TareaItem) => void updateTarea(task.id, { estado: task.estado === 'Hecho' ? 'En curso' : 'Pendiente' });
  const success = (action: 'created' | 'updated' | 'deleted' = 'updated') => { setShowForm(false); setEditing(null); refetch(); toast('success', `Task ${action} successfully`); };
  if (isLoading) return <StatePanel state="loading" label="tasks" title="Loading tasks" />;
  if (isError) return <StatePanel state="error" title="Unable to load tasks" description="Try again to refresh tasks." onRetry={refetch} />;
  return <div className="space-y-6"><PageHeader title="Tasks" description="Keep the next actions visible and easy to complete." action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />New task</Button>} />{tareas.length === 0 ? <StatePanel state="empty" title="No tasks yet" description="Create a task to begin." /> : <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><section aria-label="Open tasks" className="space-y-3"><h2 className="text-base font-semibold">Open tasks ({open.length})</h2>{open.length ? open.map((task) => <TaskRow key={task.id} task={task} onEdit={() => setEditing(task)} onAdvance={() => advance(task)} onBack={task.estado === 'En curso' ? () => back(task) : undefined} />) : <StatePanel state="empty" title="No open tasks" />}</section><section aria-label="Completed tasks" className="space-y-3"><h2 className="text-base font-semibold">Completed tasks ({completed.length})</h2>{completed.length ? completed.map((task) => <TaskRow key={task.id} task={task} onEdit={() => setEditing(task)} onBack={() => back(task)} />) : <StatePanel state="empty" title="No completed tasks" />}</section></div>}<Dialog open={showForm} onClose={() => setShowForm(false)} title="New task"><TareaForm onSuccess={() => success('created')} onCancel={() => setShowForm(false)} /></Dialog><Dialog open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit: ${editing.titulo}` : 'Edit task'}>{editing ? <TareaForm initial={{ id: editing.id, titulo: editing.titulo, descripcion: (editing as TareaItem & { descripcion?: string }).descripcion ?? '', prioridad: editing.prioridad, estado: editing.estado, clienteId: editing.cliente?.id ?? '', fechaLimite: editing.fechaLimite?.split('T')[0] ?? '' }} onSuccess={success} onCancel={() => setEditing(null)} /> : null}</Dialog></div>;
}
