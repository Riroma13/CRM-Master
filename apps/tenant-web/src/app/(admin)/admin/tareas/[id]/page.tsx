'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { fetchTareaDetail } from '@/hooks/use-tareas';
import type { TareaDetail } from '@/lib/api-types';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/foundation/page-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('es-ES') : 'No due date';
}

function DetailError({ missing, onRetry }: { missing: boolean; onRetry: () => void }) {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/tareas"
        className="inline-flex items-center gap-2 text-sm text-[#0F172A] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to tasks
      </Link>
      <StatePanel
        state="error"
        title={missing ? 'Task not found' : 'Unable to load task'}
        description={missing ? 'This task may have been removed or is no longer available.' : 'Try again to refresh this task.'}
        onRetry={onRetry}
      />
    </div>
  );
}

function TaskFacts({ task }: { task: TareaDetail }) {
  return (
    <Card>
      <CardContent className="p-4">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#45464D]">Priority</dt>
            <dd className="mt-1"><StatusBadge status={task.prioridad} label={task.prioridad} /></dd>
          </div>
          <div>
            <dt className="text-[#45464D]">Related client</dt>
            <dd className="mt-1">{task.cliente?.nombre ?? 'No client assigned'}</dd>
          </div>
          <div>
            <dt className="text-[#45464D]">Related system</dt>
            <dd className="mt-1">{task.sistemaId ?? 'No system assigned'}</dd>
          </div>
          <div>
            <dt className="text-[#45464D]">Due date</dt>
            <dd className="mt-1">{formatDate(task.fechaLimite)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export default function TareaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [task, setTask] = useState<TareaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTask(await fetchTareaDetail(id));
    } catch (err) {
      setTask(null);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <StatePanel state="loading" label="task details" title="Loading task details" />;
  if (error) return <DetailError missing={error instanceof ApiError && error.status === 404} onRetry={load} />;
  if (!task) return <DetailError missing onRetry={load} />;

  const isCompleted = task.estado === 'Hecho';
  return (
    <div className="space-y-6">
      <Link
        href="/admin/tareas"
        className="inline-flex items-center gap-2 text-sm text-[#0F172A] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to tasks
      </Link>
      <PageHeader
        title={task.titulo}
        description={isCompleted ? 'Completed task' : 'Open task'}
        action={<StatusBadge status={task.estado} label={task.estado} />}
      />
      <section aria-labelledby="task-overview-heading" className="space-y-3">
        <h2 id="task-overview-heading" className="text-base font-semibold">Overview</h2>
        <TaskFacts task={task} />
      </section>
      <section aria-labelledby="task-context-heading" className="space-y-3">
        <h2 id="task-context-heading" className="text-base font-semibold">Context</h2>
        <Card><CardContent className="p-4 text-sm text-[#45464D]">{isCompleted ? 'This task is complete.' : 'This task remains in the action queue.'}</CardContent></Card>
      </section>
    </div>
  );
}
