import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabSistemas } from '../TabSistemas';
import { createMockCliente } from '@/test/factories';

describe('TabSistemas', () => {
  it('shows empty state when no sistemas', () => {
    const cliente = createMockCliente({ sistemas: [] });
    render(<TabSistemas cliente={cliente} />);
    expect(
      screen.getByText('Este cliente no tiene sistemas registrados.'),
    ).toBeInTheDocument();
  });

  it('renders sistema name and type', () => {
    const cliente = createMockCliente();
    render(<TabSistemas cliente={cliente} />);
    expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    expect(screen.getByText('Gestor documental')).toBeInTheDocument();
  });

  it('renders version when present', () => {
    const cliente = createMockCliente();
    render(<TabSistemas cliente={cliente} />);
    expect(screen.getByText('2.5.0')).toBeInTheDocument();
  });

  it('renders entorno when present', () => {
    const cliente = createMockCliente();
    render(<TabSistemas cliente={cliente} />);
    expect(screen.getByText('Producción')).toBeInTheDocument();
  });

  it('renders health badge', () => {
    const cliente = createMockCliente();
    render(<TabSistemas cliente={cliente} />);
    expect(screen.getByText('Buena')).toBeInTheDocument();
  });

  it('renders last check date when present', () => {
    const cliente = createMockCliente();
    render(<TabSistemas cliente={cliente} />);
    expect(screen.getByText(/Último chequeo:/)).toBeInTheDocument();
  });

  it('renders detail link for each sistema', () => {
    const cliente = createMockCliente();
    render(<TabSistemas cliente={cliente} />);
    const detailLinks = screen.getAllByText('Detalle');
    expect(detailLinks.length).toBe(cliente.sistemas.length);
  });

  it('renders without version when not present', () => {
    const cliente = createMockCliente({
      sistemas: [
        { ...createMockCliente().sistemas[0], version: null },
      ],
    });
    render(<TabSistemas cliente={cliente} />);
    expect(screen.queryByText('2.5.0')).not.toBeInTheDocument();
  });

  it('renders multiple sistemas', () => {
    const cliente = createMockCliente({
      sistemas: [
        { ...createMockCliente().sistemas[0] },
        {
          id: 'sys-2',
          nombreSistema: 'Sistema QA',
          tipo: 'Testing',
          entorno: 'QA',
          version: null,
          estadoTecnico: '🟡',
          fechaUltimoChequeo: null,
          items: [],
        },
      ],
    });
    render(<TabSistemas cliente={cliente} />);
    expect(screen.getByText('BeeHive producción')).toBeInTheDocument();
    expect(screen.getByText('Sistema QA')).toBeInTheDocument();
  });
});
