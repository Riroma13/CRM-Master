import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiBar } from './kpi-bar';

describe('KpiBar', () => {
  const kpis = { hoy: 3, pendientes: 5, semana: 12 };

  it('renders all KPI cards with values', () => {
    render(<KpiBar kpis={kpis} />);

    expect(screen.getByText('Citas hoy')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Esta semana')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders responsive grid classes', () => {
    const { container } = render(<KpiBar kpis={kpis} />);
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).toContain('lg:grid-cols-3');
  });
});
