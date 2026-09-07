import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TareasPage from './page';
import { useTareas } from '@/hooks/use-tareas';

vi.mock('@/hooks/use-tareas', () => ({ useTareas: vi.fn() }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/components/forms/tarea-form', () => ({ TareaForm: () => null }));
vi.mock('@/components/ui/dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

describe('TareasPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders an action queue with open/completed task links and real fields', () => {
    vi.mocked(useTareas).mockReturnValue({
      tareas: [
        { id: 'task-1', titulo: 'Review inventory', estado: 'Pendiente', prioridad: 'Alta', fechaLimite: '2026-09-04T00:00:00Z', cliente: { id: 'c-1', nombre: 'Acme' } },
        { id: 'task-2', titulo: 'Close report', estado: 'Hecho', prioridad: 'Baja', cliente: null },
      ], isLoading: false, isError: false, error: null, refetch: vi.fn(), updateTarea: vi.fn(), createTarea: vi.fn(), deleteTarea: vi.fn(),
    });

    render(<TareasPage />);
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Open tasks' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Completed tasks' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review inventory' })).toHaveAttribute('href', '/admin/tareas/task-1');
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText(/4\/9\/2026/)).toBeInTheDocument();
  });

  it('renders loading, empty, and retryable error states', () => {
    vi.mocked(useTareas).mockReturnValue({ tareas: [], isLoading: true, isError: false, error: null, refetch: vi.fn(), updateTarea: vi.fn(), createTarea: vi.fn(), deleteTarea: vi.fn() });
    const { rerender } = render(<TareasPage />);
    expect(screen.getByRole('status', { name: 'Loading tasks' })).toBeInTheDocument();

    vi.mocked(useTareas).mockReturnValue({ tareas: [], isLoading: false, isError: false, error: null, refetch: vi.fn(), updateTarea: vi.fn(), createTarea: vi.fn(), deleteTarea: vi.fn() });
    rerender(<TareasPage />);
    expect(screen.getByRole('status')).toHaveTextContent('No tasks yet');

    const retry = vi.fn();
    vi.mocked(useTareas).mockReturnValue({ tareas: [], isLoading: false, isError: true, error: new Error('secret'), refetch: retry, updateTarea: vi.fn(), createTarea: vi.fn(), deleteTarea: vi.fn() });
    rerender(<TareasPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
