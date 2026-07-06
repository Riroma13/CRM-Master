import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabInventario } from '../TabInventario';
import { createMockCliente } from '@/test/factories';

describe('TabInventario', () => {
  it('shows empty state when no items across all sistemas', () => {
    const cliente = createMockCliente({
      sistemas: [{ ...createMockCliente().sistemas[0], items: [] }],
    });
    render(<TabInventario cliente={cliente} />);
    expect(
      screen.getByText('Este cliente no tiene inventario registrado.'),
    ).toBeInTheDocument();
  });

  it('groups items by categoria', () => {
    const cliente = createMockCliente({
      sistemas: [
        {
          ...createMockCliente().sistemas[0],
          items: [
            { id: 'i1', categoria: 'Módulo funcional', nombre: 'Facturación', estado: 'Implementado', responsable: 'Ana' },
            { id: 'i2', categoria: 'Integración', nombre: 'API REST', estado: 'Parcial', responsable: 'Luis' },
          ],
        },
      ],
    });
    render(<TabInventario cliente={cliente} />);

    expect(screen.getByText('MÓDULO FUNCIONAL')).toBeInTheDocument();
    expect(screen.getByText('INTEGRACIÓN')).toBeInTheDocument();
    expect(screen.getByText('Facturación')).toBeInTheDocument();
    expect(screen.getByText('API REST')).toBeInTheDocument();
  });

  it('shows item count per categoria', () => {
    const cliente = createMockCliente({
      sistemas: [
        {
          ...createMockCliente().sistemas[0],
          items: [
            { id: 'i1', categoria: 'Módulo funcional', nombre: 'Facturación', estado: 'Implementado', responsable: null },
          ],
        },
      ],
    });
    render(<TabInventario cliente={cliente} />);
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('shows sistema name for each item', () => {
    const cliente = createMockCliente();
    render(<TabInventario cliente={cliente} />);
    expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
  });

  it('shows responsable when present', () => {
    const cliente = createMockCliente();
    render(<TabInventario cliente={cliente} />);
    expect(screen.getByText(/Ricardo/)).toBeInTheDocument();
  });

  it('shows estado badge for each item', () => {
    const cliente = createMockCliente();
    render(<TabInventario cliente={cliente} />);
    expect(screen.getByText('Implementado')).toBeInTheDocument();
  });

  it('filters items by estado when filter changes', () => {
    const cliente = createMockCliente({
      sistemas: [
        {
          ...createMockCliente().sistemas[0],
          items: [
            { id: 'i1', categoria: 'Módulo funcional', nombre: 'Facturación', estado: 'Implementado', responsable: null },
            { id: 'i2', categoria: 'Módulo funcional', nombre: 'Reportes', estado: 'Parcial', responsable: null },
          ],
        },
      ],
    });
    render(<TabInventario cliente={cliente} />);

    // Both items visible initially
    expect(screen.getByText('Facturación')).toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();

    // Filter to show only Parcial
    const filter = screen.getByRole('combobox');
    fireEvent.change(filter, { target: { value: 'Parcial' } });

    expect(screen.queryByText('Facturación')).not.toBeInTheDocument();
    expect(screen.getByText('Reportes')).toBeInTheDocument();
  });

  it('shows empty group when filter matches nothing', () => {
    const cliente = createMockCliente();
    render(<TabInventario cliente={cliente} />);

    const filter = screen.getByRole('combobox');
    fireEvent.change(filter, { target: { value: 'Obsoleto' } });

    // The categoria 'Módulo funcional' will show with 0 items — still in DOM
    expect(screen.queryByText('Facturación')).not.toBeInTheDocument();
  });

  it('shows "Todos" option and resets filter', () => {
    const cliente = createMockCliente();
    render(<TabInventario cliente={cliente} />);

    const filter = screen.getByRole('combobox');
    expect(filter).toHaveValue('Todos');

    fireEvent.change(filter, { target: { value: 'Todos' } });
    expect(screen.getByText('Facturación')).toBeInTheDocument();
  });
});
