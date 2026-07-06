import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientCard } from './client-card';
import type { ClienteListItem } from '@/lib/api-types';

const mockClient = {
  id: '1',
  nombre: 'Test Client',
  tenant: { id: 't1', slug: 'test-tenant', name: 'Test Tenant' },
  saludGeneral: '🟢',
  estadoRelacion: 'Activo',
  tags: ['fiscal', 'VPS'],
  sistemas: [
    { id: 's1', nombreSistema: 'ERP', tipo: 'cloud', estadoTecnico: 'Ok' },
    { id: 's2', nombreSistema: 'CRM', tipo: 'on-premise', estadoTecnico: 'Warning' },
  ],
  ultimaActividad: '2025-01-15T10:00:00Z',
  tareasPendientes: 3,
  createdAt: '2024-01-01T00:00:00Z',
} satisfies ClienteListItem;

describe('ClientCard', () => {
  it('renders client name and health badge', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('Buena')).toBeInTheDocument();
  });

  it('renders tenant name', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.getByText('Test Tenant')).toBeInTheDocument();
  });

  it('renders tags', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.getByText('fiscal')).toBeInTheDocument();
    expect(screen.getByText('VPS')).toBeInTheDocument();
  });

  it('renders system count and pending tasks', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.getByText('2 systems')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders last activity date', () => {
    render(<ClientCard client={mockClient} />);

    expect(screen.getByText(/Last activity:/)).toBeInTheDocument();
  });

  it('renders singular system text when only one', () => {
    const singleSystem = {
      ...mockClient,
      sistemas: [{ id: 's1', nombreSistema: 'ERP', tipo: 'cloud', estadoTecnico: 'Ok' }],
    } satisfies ClienteListItem;

    render(<ClientCard client={singleSystem} />);
    expect(screen.getByText('1 system')).toBeInTheDocument();
  });

  it('renders "View Client" link', () => {
    render(<ClientCard client={mockClient} />);

    const link = screen.getByText('View Client');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/clients/1');
  });

  it('renders without tags when empty', () => {
    const noTags = {
      ...mockClient,
      tags: [],
    } satisfies ClienteListItem;

    render(<ClientCard client={noTags} />);
    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });

  it('renders without last activity when empty', () => {
    const noActivity = {
      ...mockClient,
      ultimaActividad: '',
    } satisfies ClienteListItem;

    render(<ClientCard client={noActivity} />);
    expect(screen.queryByText(/Last activity:/)).not.toBeInTheDocument();
  });
});
