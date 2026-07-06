import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientHeader } from '../ClientHeader';
import { createMockCliente } from '@/test/factories';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/clients/test-id',
}));

describe('ClientHeader', () => {
  it('renders client name', () => {
    const cliente = createMockCliente();
    render(<ClientHeader cliente={cliente} />);
    expect(screen.getByText('Asesoría García')).toBeInTheDocument();
  });

  it('renders tipoNegocio when present', () => {
    const cliente = createMockCliente();
    render(<ClientHeader cliente={cliente} />);
    expect(screen.getByText('Asesoría Fiscal')).toBeInTheDocument();
  });

  it('does not render tipoNegocio when absent', () => {
    const cliente = createMockCliente({ tipoNegocio: null });
    render(<ClientHeader cliente={cliente} />);
    expect(screen.queryByText('Asesoría Fiscal')).not.toBeInTheDocument();
  });

  it('renders salud badge with HealthBadge', () => {
    const cliente = createMockCliente({ saludGeneral: '🟢' });
    render(<ClientHeader cliente={cliente} />);
    expect(screen.getByText('Buena')).toBeInTheDocument();
  });

  it('renders all tags', () => {
    const cliente = createMockCliente({ tags: ['tag1', 'tag2', 'tag3'] });
    render(<ClientHeader cliente={cliente} />);
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('renders without tags when empty', () => {
    const cliente = createMockCliente({ tags: [] });
    render(<ClientHeader cliente={cliente} />);
    expect(screen.queryByText('factura mensual')).not.toBeInTheDocument();
  });

  it('renders contactoPrincipal when present', () => {
    const cliente = createMockCliente();
    render(<ClientHeader cliente={cliente} />);
    expect(screen.getByText(/Juan García/)).toBeInTheDocument();
  });

  it('renders fechaInicio when present', () => {
    const cliente = createMockCliente();
    render(<ClientHeader cliente={cliente} />);
    expect(screen.getByText(/Desde:/)).toBeInTheDocument();
  });

  it('renders edit button as disabled', () => {
    const cliente = createMockCliente();
    render(<ClientHeader cliente={cliente} />);
    const button = screen.getByRole('button', { name: /editar/i });
    expect(button).toBeDisabled();
  });
});
