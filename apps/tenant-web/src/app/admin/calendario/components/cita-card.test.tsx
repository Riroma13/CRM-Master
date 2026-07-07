import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitaCard } from './cita-card';
import type { Cita } from '@/lib/api-types';

const baseCita: Cita = {
  id: '1',
  tenantId: 't1',
  fecha: '2026-07-05T10:00:00Z',
  duracion: 30,
  estado: 'pendiente',
  titulo: 'Consulta',
  clienteNombre: 'Juan Pérez',
  clienteEmail: 'juan@email.com',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('CitaCard', () => {
  it('renders client name and email', () => {
    render(<CitaCard cita={baseCita} />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('juan@email.com')).toBeInTheDocument();
  });

  it('renders "Sin nombre" when clienteNombre is missing', () => {
    const cita = { ...baseCita, clienteNombre: undefined };
    render(<CitaCard cita={cita} />);
    expect(screen.getByText('Sin nombre')).toBeInTheDocument();
  });

  it('renders status badge for pendiente', () => {
    render(<CitaCard cita={baseCita} />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders status badge for confirmada', () => {
    const cita = { ...baseCita, estado: 'confirmada' as const };
    render(<CitaCard cita={cita} />);
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons when pending', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<CitaCard cita={baseCita} onConfirm={onConfirm} onCancel={onCancel} />);

    const confirmBtn = screen.getByText('Confirmar');
    const cancelBtn = screen.getByText('Cancelar');
    expect(confirmBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith('1');

    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledWith('1');
  });

  it('hides action buttons for confirmed citas', () => {
    const cita = { ...baseCita, estado: 'confirmada' as const };
    render(<CitaCard cita={cita} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });
});
