import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminDashboardPage from './page';

const mockDashboardData = {
  totalClientes: 15,
  clientesActivos: 12,
  citasHoy: 3,
  citasPendientes: 8,
  citasSemana: 20,
  tareasPendientes: 7,
  sistemasActivos: 5,
  eventosRecientes: [
    { id: 'e1', fecha: '2026-07-17T10:00:00Z', tipo: 'decision', titulo: 'Evento 1', descripcion: 'Desc' },
    { id: 'e2', fecha: '2026-07-16T10:00:00Z', tipo: 'incidencia', titulo: 'Evento 2' },
  ],
  ultimosEventos: [
    { id: 'e1', fecha: '2026-07-17T10:00:00Z', tipo: 'decision', titulo: 'Evento 1', descripcion: 'Desc' },
    { id: 'e2', fecha: '2026-07-16T10:00:00Z', tipo: 'incidencia', titulo: 'Evento 2' },
  ],
  ultimaActualizacion: '2026-07-18T12:00:00Z',
  onboardingChecklist: {
    steps: [
      { id: 'cliente', label: 'Primer cliente', done: true },
      { id: 'tarea', label: 'Primera tarea', done: false },
      { id: 'documento', label: 'Primer documento', done: false },
      { id: 'sistema', label: 'Primer sistema', done: false },
    ],
  },
};

vi.mock('@/hooks/use-dashboard', () => ({
  useDashboard: vi.fn(),
}));

vi.mock('@/hooks/use-announcements', () => ({
  useAnnouncements: vi.fn(() => ({ announcements: [] })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

import { useDashboard } from '@/hooks/use-dashboard';

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 5 KPI cards with correct values from data', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      loading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('de 15 totales')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('renders max 5 recent events', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: {
        ...mockDashboardData,
        eventosRecientes: [
          { id: 'e1', fecha: '2026-07-17T10:00:00Z', tipo: 'decision', titulo: 'Evento 1' },
          { id: 'e2', fecha: '2026-07-16T10:00:00Z', tipo: 'incidencia', titulo: 'Evento 2' },
        ],
        ultimosEventos: [
          { id: 'e1', fecha: '2026-07-17T10:00:00Z', tipo: 'decision', titulo: 'Evento 1' },
          { id: 'e2', fecha: '2026-07-16T10:00:00Z', tipo: 'incidencia', titulo: 'Evento 2' },
        ],
      },
      isLoading: false,
      loading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    expect(screen.getByText('Evento 1')).toBeDefined();
    expect(screen.getByText('Evento 2')).toBeDefined();
  });

  it('shows loading skeleton when loading', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: null,
      isLoading: true,
      loading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<AdminDashboardPage />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });

  it('shows error banner when isError', () => {
    vi.mocked(useDashboard).mockReturnValue({
      data: null,
      isLoading: false,
      loading: false,
      isError: true,
      error: new Error('Failed to fetch'),
      refetch: vi.fn(),
    });

    render(<AdminDashboardPage />);

    expect(screen.getByText('Error al cargar el dashboard')).toBeDefined();
    expect(screen.getByText('Reintentar')).toBeDefined();
  });
});
