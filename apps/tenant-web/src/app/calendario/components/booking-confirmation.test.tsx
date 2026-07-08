import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookingConfirmation } from './booking-confirmation';
import type { Cita } from '@/lib/api-types';

const mockCita: Cita = {
  id: 'abc-123-def',
  tenantId: 'tenant-1',
  fecha: '2026-07-15T10:00:00Z',
  duracion: 30,
  estado: 'pendiente',
  titulo: 'Consulta',
  clienteNombre: 'Juan Pérez',
  clienteEmail: 'juan@email.com',
  createdAt: '2026-07-05T12:00:00Z',
  updatedAt: '2026-07-05T12:00:00Z',
};

describe('BookingConfirmation', () => {
  it('renders success heading', () => {
    render(<BookingConfirmation cita={mockCita} onReset={() => {}} />);

    expect(screen.getByText('Cita confirmada')).toBeInTheDocument();
  });

  it('renders cita details', () => {
    render(<BookingConfirmation cita={mockCita} onReset={() => {}} />);

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('juan@email.com')).toBeInTheDocument();
    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('renders confirmation number', () => {
    render(<BookingConfirmation cita={mockCita} onReset={() => {}} />);
    expect(screen.getByText(/abc-123-def/)).toBeInTheDocument();
  });

  it('renders a volver button that calls onReset', () => {
    const handleReset = vi.fn();
    render(<BookingConfirmation cita={mockCita} onReset={handleReset} />);

    fireEvent.click(screen.getByRole('button', { name: 'Volver al inicio' }));

    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
