import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitaList } from './cita-list';
import type { Cita } from '@/lib/api-types';

const mockCitas: Cita[] = [
  {
    id: '1',
    tenantId: 't1',
    fecha: '2026-07-05T10:00:00Z',
    duracion: 30,
    estado: 'pendiente',
    titulo: 'Consulta',
    clienteNombre: 'Juan Pérez',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
  {
    id: '2',
    tenantId: 't1',
    fecha: '2026-07-06T11:00:00Z',
    duracion: 30,
    estado: 'cancelada',
    titulo: 'Revisión',
    clienteNombre: 'María López',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  },
];

const noop = vi.fn();

describe('CitaList', () => {
  it('renders loading state', () => {
    render(
      <CitaList
        citas={[]}
        isLoading={true}
        isError={false}
        error={null}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText('Cargando citas...')).toBeInTheDocument();
  });

  it('renders empty state for próximas tab', () => {
    render(
      <CitaList
        citas={[]}
        isLoading={false}
        isError={false}
        error={null}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText('No hay citas próximas.')).toBeInTheDocument();
  });

  it('renders tabs and filters correctly', () => {
    render(
      <CitaList
        citas={mockCitas}
        isLoading={false}
        isError={false}
        error={null}
        onConfirm={noop}
        onCancel={noop}
      />,
    );

    // Próximas tab shows pendiente/confirmada citas
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByText('María López')).not.toBeInTheDocument();

    // Switch to historial tab
    fireEvent.click(screen.getByText('Historial'));
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <CitaList
        citas={[]}
        isLoading={false}
        isError={true}
        error={new Error('Failed to load')}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
