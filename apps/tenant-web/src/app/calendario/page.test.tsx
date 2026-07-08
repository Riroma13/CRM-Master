import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CalendarioPage from './page';
import { useSlots } from '@/hooks/use-slots';
import { api } from '@/lib/api';
import type { Slot, Cita } from '@/lib/api-types';

vi.mock('@/hooks/use-slots', () => ({
  useSlots: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  },
  NetworkError: class NetworkError extends Error {
    cause: unknown;
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'NetworkError';
      this.cause = cause;
    }
  },
}));

const mockSlots: Slot[] = [
  { start: '2026-07-15T09:00:00Z', end: '2026-07-15T09:30:00Z', available: true },
  { start: '2026-07-15T10:00:00Z', end: '2026-07-15T10:30:00Z', available: true },
];

const mockCitaResponse: Cita = {
  id: 'cita-123',
  tenantId: 'tenant-1',
  fecha: '2026-07-15T09:00:00Z',
  duracion: 30,
  estado: 'pendiente',
  titulo: 'Consulta',
  clienteNombre: 'Juan Pérez',
  clienteEmail: 'juan@email.com',
  createdAt: '2026-07-05T12:00:00Z',
  updatedAt: '2026-07-05T12:00:00Z',
};

describe('CalendarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSlots).mockReturnValue({
      slots: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders the page title', () => {
    render(<CalendarioPage />);

    expect(screen.getByText('Agenda una cita')).toBeInTheDocument();
  });

  it('renders the CalendarPicker in step 1', () => {
    render(<CalendarioPage />);

    expect(screen.getByLabelText('Calendario de citas')).toBeInTheDocument();
    expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument();
  });

  it('shows slots when a date is selected and slots are available', async () => {
    vi.mocked(useSlots).mockReturnValue({
      slots: mockSlots,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CalendarioPage />);

    // Select a day from the calendar
    const dayButton = screen.getByRole('button', { name: '15' });
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });
  });

  it('shows selection hint when date has no slots', async () => {
    render(<CalendarioPage />);

    const dayButton = screen.getByRole('button', { name: '15' });
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByText('No hay horarios disponibles para esta fecha.')).toBeInTheDocument();
    });
  });

  it('shows booking form after selecting a slot', async () => {
    vi.mocked(useSlots).mockReturnValue({
      slots: mockSlots,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<CalendarioPage />);

    // Select date
    fireEvent.click(screen.getByRole('button', { name: '15' }));

    // Wait for slots to appear, then select one
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('option')[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();
    });
  });

  it('shows confirmation after successful booking', async () => {
    vi.mocked(useSlots).mockReturnValue({
      slots: mockSlots,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(api.post).mockResolvedValue(mockCitaResponse);

    render(<CalendarioPage />);

    // Select date
    fireEvent.click(screen.getByRole('button', { name: '15' }));

    // Wait for slots
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    // Select slot
    fireEvent.click(screen.getAllByRole('option')[0]);

    // Wait for form
    await waitFor(() => {
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();
    });

    // Fill form and submit
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'juan@email.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(screen.getByText('Cita confirmada')).toBeInTheDocument();
    });
  });

  it('resets to initial state when clicking volver', async () => {
    vi.mocked(useSlots).mockReturnValue({
      slots: mockSlots,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(api.post).mockResolvedValue(mockCitaResponse);

    render(<CalendarioPage />);

    // Complete booking flow
    fireEvent.click(screen.getByRole('button', { name: '15' }));

    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('option')[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'juan@email.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(screen.getByText('Cita confirmada')).toBeInTheDocument();
    });

    // Click volver
    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));

    await waitFor(() => {
      expect(screen.getByText('Selecciona una fecha')).toBeInTheDocument();
    });
  });
});
