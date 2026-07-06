import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EventoForm } from '../EventoForm';
import { createMockCliente } from '@/test/factories';

const mockGet = vi.fn();
const mockPost = vi.fn();
const onClose = vi.fn();
const onSuccess = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

const mockClienteId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const mockSistemaId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

const clienteWithSistemas = createMockCliente();

describe('EventoForm — modal lifecycle (task 5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(clienteWithSistemas);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders dialog in open state with title', async () => {
    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });
  });

  it('loads sistemas on mount and shows select', async () => {
    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        `/api/v1/admin/clientes/${mockClienteId}`,
      );
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });
  });

  it('shows loading state while sistemas load', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText('Cargando sistemas...')).toBeInTheDocument();
  });

  it('calls onClose when dialog close button is clicked', async () => {
    // We can't easily click the X button since it's in the DialogPrimitive.Close
    // Instead, we use the onOpenChange callback — the Dialog has open={true}
    // onOpenChange with false triggers onClose
    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    });

    // Click "Cancelar" button
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits valid data and calls onSuccess after delay', async () => {
    vi.useFakeTimers();
    mockPost.mockResolvedValue({ id: 'new-evento' });

    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });

    // Fill in titulo
    const tituloInput = screen.getByPlaceholderText(
      /Ej: Migrar a PostgreSQL 16/,
    );
    fireEvent.change(tituloInput, { target: { value: 'Nuevo evento de prueba' } });

    // Submit
    fireEvent.click(screen.getByText('Crear Evento'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        `/api/v1/admin/clientes/${mockClienteId}/eventos`,
        expect.objectContaining({
          titulo: 'Nuevo evento de prueba',
        }),
      );
    });

    // Success message should appear
    expect(
      screen.getByText('Evento creado correctamente'),
    ).toBeInTheDocument();

    // After timeout, onSuccess should be called
    vi.advanceTimersByTime(1300);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows error when submitting empty titulo', async () => {
    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });

    // Clear titulo and submit
    const tituloInput = screen.getByPlaceholderText(
      /Ej: Migrar a PostgreSQL 16/,
    );
    fireEvent.change(tituloInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('Crear Evento'));

    expect(
      screen.getByText('El título es obligatorio.'),
    ).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows API error message when post fails', async () => {
    const ApiError = (await import('@/lib/api')).ApiError;
    mockPost.mockRejectedValue(
      new ApiError('Bad Request', 400, {
        message: 'sistemaId no encontrado',
      }),
    );

    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });

    // Fill in titulo
    const tituloInput = screen.getByPlaceholderText(
      /Ej: Migrar a PostgreSQL 16/,
    );
    fireEvent.change(tituloInput, { target: { value: 'Evento test' } });

    // Submit
    fireEvent.click(screen.getByText('Crear Evento'));

    await waitFor(() => {
      expect(
        screen.getByText('sistemaId no encontrado'),
      ).toBeInTheDocument();
    });
  });

  it('shows network error when fetch fails', async () => {
    mockPost.mockRejectedValue(new Error('Failed to fetch'));

    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });

    const tituloInput = screen.getByPlaceholderText(
      /Ej: Migrar a PostgreSQL 16/,
    );
    fireEvent.change(tituloInput, { target: { value: 'Evento test' } });
    fireEvent.click(screen.getByText('Crear Evento'));

    await waitFor(() => {
      expect(
        screen.getByText('Error de red. Intente nuevamente.'),
      ).toBeInTheDocument();
    });
  });

  it('disables submit while submitting', async () => {
    mockPost.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <EventoForm
        clienteId={mockClienteId}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    });

    const tituloInput = screen.getByPlaceholderText(
      /Ej: Migrar a PostgreSQL 16/,
    );
    fireEvent.change(tituloInput, { target: { value: 'Evento test' } });
    fireEvent.click(screen.getByText('Crear Evento'));

    await waitFor(() => {
      const submitBtn = screen.getByText('Guardando...');
      expect(submitBtn).toBeInTheDocument();
    });
  });
});
