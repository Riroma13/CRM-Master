import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingForm } from './booking-form';

describe('BookingForm', () => {
  it('renders all form fields', () => {
    render(<BookingForm onSubmit={() => {}} isLoading={false} />);

    expect(screen.getByLabelText('Nombre *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email *')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar cita' })).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    render(<BookingForm onSubmit={() => {}} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument();
    });

    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument();
  });

  it('shows email format error for invalid email', async () => {
    render(<BookingForm onSubmit={() => {}} isLoading={false} />);

    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'email-invalido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(screen.getByText('El email no es válido')).toBeInTheDocument();
    });
  });

  it('shows max length error for description', async () => {
    render(<BookingForm onSubmit={() => {}} isLoading={false} />);

    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'juan@email.com' } });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'a'.repeat(501) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(screen.getByText('La descripción no puede superar los 500 caracteres')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with valid data', async () => {
    const handleSubmit = vi.fn();
    render(<BookingForm onSubmit={handleSubmit} isLoading={false} />);

    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Juan Pérez' } });
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'juan@email.com' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+34600123456' } });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Consulta fiscal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = handleSubmit.mock.calls[0][0] as { clienteNombre: string; clienteEmail: string; clienteTelefono?: string; descripcion?: string };
    expect(submittedData.clienteNombre).toBe('Juan Pérez');
    expect(submittedData.clienteEmail).toBe('juan@email.com');
    expect(submittedData.clienteTelefono).toBe('+34600123456');
    expect(submittedData.descripcion).toBe('Consulta fiscal');
  });

  it('disables submit button while loading', () => {
    render(<BookingForm onSubmit={() => {}} isLoading={true} />);

    expect(screen.getByRole('button', { name: 'Confirmando...' })).toBeDisabled();
  });

  it('links validation errors to inputs via aria-describedby', async () => {
    render(<BookingForm onSubmit={() => {}} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      const nombreInput = screen.getByLabelText('Nombre *');
      expect(nombreInput).toHaveAttribute('aria-describedby');
    });
  });
});
