import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SistemaDetailPage from './page';
import { api } from '@/lib/api';
import { normalizeInventoryDate } from '@/components/forms/item-form';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/components/forms/sistema-form', () => ({
  SistemaForm: ({ initial, onSuccess }: { initial: { nombreSistema: string; tipo: string; clienteId: string; entorno: string; version: string }; onSuccess: () => void }) => (
    <div data-testid="system-form-initials">
      {JSON.stringify(initial)}
      <button type="button" onClick={onSuccess}>Save system</button>
    </div>
  ),
}));
vi.mock('@/components/ui/dialog', () => ({ Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));

describe('SistemaDetailPage', () => {
  it('renders supported system facts and related inventory rows', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'sys-1', nombreSistema: 'ERP', tipo: 'SaaS', estadoTecnico: '🟢',
      entorno: 'Production', version: '1.2', cliente: { id: 'c-1', nombre: 'Acme' },
      items: [{ id: 'item-1', nombre: 'Database', categoria: 'Data', estado: 'Active' }],
    });

    await act(async () => { render(<SistemaDetailPage params={Promise.resolve({ id: 'sys-1' })} />); });
    expect(await screen.findByRole('heading', { name: 'ERP' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.getAllByText('Database')).toHaveLength(2);
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
  });

  it('exposes edit with the loaded system values', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      id: 'sys-1', nombreSistema: 'ERP', tipo: 'SaaS', estadoTecnico: '🟢',
      entorno: 'Production', version: '1.2', cliente: { id: 'c-1', nombre: 'Acme' }, items: [],
    });

    await act(async () => { render(<SistemaDetailPage params={Promise.resolve({ id: 'sys-1' })} />); });
    expect(screen.getByRole('button', { name: 'Edit system' })).toBeInTheDocument();
    expect(screen.getByTestId('system-form-initials')).toHaveTextContent(JSON.stringify({
      id: 'sys-1', nombreSistema: 'ERP', tipo: 'SaaS', clienteId: 'c-1', entorno: 'Production', version: '1.2',
    }));
  });

  it('renders a labelled retryable error state', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('secret server details'));
    await act(async () => { render(<SistemaDetailPage params={Promise.resolve({ id: 'missing' })} />); });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('secret server details')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('normalizes valid date-only and ISO values without timezone conversion', () => {
    expect(normalizeInventoryDate('2024-02-29T23:30:00.000Z')).toBe('2024-02-29');
    expect(normalizeInventoryDate('2024-02-30')).toBe('');
    expect(normalizeInventoryDate('not-a-date')).toBe('');
  });

  it('closes the edit flow and reloads after a tenant-scoped save', async () => {
    vi.clearAllMocks();
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        id: 'sys-1', nombreSistema: 'ERP', tipo: 'SaaS', estadoTecnico: '🟢',
        cliente: { id: 'c-1', nombre: 'Acme' }, items: [],
      })
      .mockResolvedValueOnce({
        id: 'sys-1', nombreSistema: 'ERP updated', tipo: 'SaaS', estadoTecnico: '🟢',
        cliente: { id: 'c-1', nombre: 'Acme' }, items: [],
      });

    await act(async () => { render(<SistemaDetailPage params={Promise.resolve({ id: 'sys-1' })} />); });
    expect(await screen.findByRole('heading', { name: 'ERP' })).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save system' })); });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { name: 'ERP updated' })).toBeInTheDocument();
    expect(JSON.stringify(vi.mocked(api.get).mock.calls)).not.toContain('tenantId');
  });
});
