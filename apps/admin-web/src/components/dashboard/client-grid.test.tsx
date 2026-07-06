import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientGrid } from './client-grid';
import type { ClienteListItem, ClientFilters, PaginationMeta } from '@/lib/api-types';

vi.mock('@/hooks/use-clients', () => ({
  useClients: vi.fn(),
}));

import { useClients } from '@/hooks/use-clients';

const mockFilters: ClientFilters = { page: 1, limit: 20 };
const mockPagination: PaginationMeta = { page: 1, limit: 20, total: 2, totalPages: 1 };
const mockClients: ClienteListItem[] = [
  {
    id: '1',
    nombre: 'Client A',
    tenant: { id: 't1', slug: 'a', name: 'Tenant A' },
    saludGeneral: '🟢',
    estadoRelacion: 'Activo',
    tags: ['fiscal'],
    sistemas: [],
    ultimaActividad: '2025-01-15T10:00:00Z',
    tareasPendientes: 0,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    nombre: 'Client B',
    tenant: { id: 't2', slug: 'b', name: 'Tenant B' },
    saludGeneral: '🔴',
    estadoRelacion: 'Activo',
    tags: ['contable'],
    sistemas: [],
    ultimaActividad: '2025-01-14T10:00:00Z',
    tareasPendientes: 5,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const onPageChange = vi.fn();

describe('ClientGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons', () => {
    vi.mocked(useClients).mockReturnValue({
      data: [],
      pagination: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(
      <ClientGrid filters={mockFilters} onPageChange={onPageChange} />,
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('renders client cards with data', () => {
    vi.mocked(useClients).mockReturnValue({
      data: mockClients,
      pagination: mockPagination,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientGrid filters={mockFilters} onPageChange={onPageChange} />);

    expect(screen.getByText('Client A')).toBeInTheDocument();
    expect(screen.getByText('Client B')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    vi.mocked(useClients).mockReturnValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientGrid filters={mockFilters} onPageChange={onPageChange} />);

    expect(screen.getByText('No clients found')).toBeInTheDocument();
  });

  it('renders empty state hint for filtered queries', () => {
    vi.mocked(useClients).mockReturnValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <ClientGrid
        filters={{ ...mockFilters, search: 'zzz' }}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
  });

  it('renders empty state for no filters', () => {
    vi.mocked(useClients).mockReturnValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ClientGrid filters={mockFilters} onPageChange={onPageChange} />);

    expect(screen.getByText('No clients registered yet')).toBeInTheDocument();
  });

  it('renders error state with retry', () => {
    const refetch = vi.fn();
    vi.mocked(useClients).mockReturnValue({
      data: [],
      pagination: null,
      isLoading: false,
      isError: true,
      error: new Error('Server error'),
      refetch,
    });

    render(<ClientGrid filters={mockFilters} onPageChange={onPageChange} />);

    expect(screen.getByText('Error loading clients')).toBeInTheDocument();
    screen.getByText('Retry').click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
