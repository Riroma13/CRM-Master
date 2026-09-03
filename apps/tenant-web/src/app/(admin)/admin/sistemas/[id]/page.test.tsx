import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import SistemaDetailPage from './page';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), delete: vi.fn() } }));
vi.mock('@/components/forms/item-form', () => ({ ItemForm: () => null }));
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

  it('renders a labelled retryable error state', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('secret server details'));
    await act(async () => { render(<SistemaDetailPage params={Promise.resolve({ id: 'missing' })} />); });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('secret server details')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
