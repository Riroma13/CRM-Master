import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminCalendarioPage from './page';

const mockCitas = [
  {
    id: '1',
    tenantId: 't1',
    fecha: new Date().toISOString(),
    duracion: 30,
    estado: 'pendiente',
    titulo: 'Consulta',
    clienteNombre: 'Juan Pérez',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockConfig = {
  timezone: 'Europe/Madrid',
  slotDuration: 30,
  minNotice: 240,
  maxDays: 30,
  dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
  blockedDates: ['2026-08-15'],
};

vi.mock('@/hooks/use-citas', () => ({
  useCitas: vi.fn(),
}));

vi.mock('@/hooks/use-disponibilidad', () => ({
  useDisponibilidad: vi.fn(),
}));

const { useCitas } = await import('@/hooks/use-citas');
const { useDisponibilidad } = await import('@/hooks/use-disponibilidad');

describe('AdminCalendarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCitas).mockReturnValue({
      citas: mockCitas,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      confirmCita: vi.fn(),
      cancelCita: vi.fn(),
    });
    vi.mocked(useDisponibilidad).mockReturnValue({
      config: mockConfig,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      updateConfig: vi.fn(),
    });
  });

  it('renders the page with title and refresh button', () => {
    render(<AdminCalendarioPage />);
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Refrescar')).toBeInTheDocument();
  });

  it('renders KPI bar with citas data', () => {
    render(<AdminCalendarioPage />);
    expect(screen.getByText('Citas hoy')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Esta semana')).toBeInTheDocument();
  });

  it('renders config section with schedule editor and blocked dates', () => {
    render(<AdminCalendarioPage />);
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Horario semanal')).toBeInTheDocument();
    expect(screen.getByText('Fechas bloqueadas')).toBeInTheDocument();
  });

  it('renders save button that is disabled when no changes', () => {
    render(<AdminCalendarioPage />);
    const saveBtn = screen.getByText('Guardar cambios');
    expect(saveBtn).toBeDisabled();
  });
});
