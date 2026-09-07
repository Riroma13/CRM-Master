import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ApiError, api } from '@/lib/api';
import type { TareaDetail } from '@/lib/api-types';
import { fetchTareaDetail } from '@/hooks/use-tareas';
import TareaDetailPage from './page';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { get: vi.fn() } };
});

describe('TareaDetail contract', () => {
  it('models the exact authenticated detail response', async () => {
    const response = {
      id: 'task-1',
      tenantId: 'tenant-1',
      clienteId: null,
      sistemaId: 'system-1',
      titulo: 'Review inventory',
      estado: 'Pendiente',
      prioridad: 'Alta',
      fechaLimite: null,
      cliente: null,
    } satisfies TareaDetail;
    vi.mocked(api.get).mockResolvedValueOnce(response);

    const result = await fetchTareaDetail('task-1');

    expect(result).toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/api/v1/tenant/tareas/task-1', undefined, { auth: true });
    expect('descripcion' in result).toBe(false);
    expect(result.fechaLimite).toBeNull();
    expect(result.cliente).toBeNull();
  });

  it('supports the selected nullable client and serialized deadline', async () => {
    const response = {
      id: 'task-2',
      tenantId: 'tenant-1',
      clienteId: 'client-1',
      sistemaId: null,
      titulo: 'Call client',
      estado: 'En curso',
      prioridad: 'Media',
      fechaLimite: '2026-09-01T12:00:00.000Z',
      cliente: { id: 'client-1', nombre: 'Acme Corp' },
    } satisfies TareaDetail;
    vi.mocked(api.get).mockResolvedValueOnce(response);

    await expect(fetchTareaDetail('task-2')).resolves.toEqual(response);
  });

  it('preserves the API 404 contract for a missing record', async () => {
    const notFound = new ApiError('Request failed with status 404', 404, {
      message: 'Tarea no encontrada',
    });
    vi.mocked(api.get).mockRejectedValueOnce(notFound);

    await expect(fetchTareaDetail('missing-task')).rejects.toMatchObject({ status: 404 });
  });
});

describe('detail route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders returned fields, task navigation, and keyboard-accessible actions without tenant params', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'task-1', tenantId: 'tenant-1', clienteId: 'client-1', sistemaId: 'system-1',
      titulo: 'Review inventory', estado: 'Pendiente', prioridad: 'Alta',
      fechaLimite: '2026-09-04T00:00:00.000Z', cliente: { id: 'client-1', nombre: 'Acme Corp' },
    });

    await act(async () => {
      render(<TareaDetailPage params={Promise.resolve({ id: 'task-1' })} />);
    });

    expect(await screen.findByRole('heading', { name: 'Review inventory' })).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText(/4\/9\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to tasks/i })).toHaveAttribute('href', '/admin/tareas');
    expect(api.get).toHaveBeenCalledWith('/api/v1/tenant/tareas/task-1', undefined, { auth: true });
    expect(vi.mocked(api.get).mock.calls[0][0]).not.toContain('tenantId');
  });

  it('renders a missing-detail 404 state with a retry action', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError('Request failed with status 404', 404));

    await act(async () => {
      render(<TareaDetailPage params={Promise.resolve({ id: 'missing-task' })} />);
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Task not found');
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveAttribute('type', 'button');
  });

  it('retries the detail request from the error state', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error('server unavailable'))
      .mockResolvedValueOnce({
        id: 'task-2', tenantId: 'tenant-1', clienteId: null, sistemaId: null,
        titulo: 'Call client', estado: 'Hecho', prioridad: 'Media', fechaLimite: null, cliente: null,
      });

    await act(async () => {
      render(<TareaDetailPage params={Promise.resolve({ id: 'task-2' })} />);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Call client' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
