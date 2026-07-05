import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  it('renders label, value, and subtitle', () => {
    render(
      <KpiCard
        icon={Users}
        label="Active Clients"
        value={42}
        subtitle="out of 100 total"
      />,
    );

    expect(screen.getByText('Active Clients')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('out of 100 total')).toBeInTheDocument();
  });

  it('renders without subtitle', () => {
    render(<KpiCard icon={Users} label="Critical" value={0} />);

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('out of 100 total')).not.toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<KpiCard icon={Users} label="Health" value="98.2%" subtitle="Stable" />);

    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('98.2%')).toBeInTheDocument();
    expect(screen.getByText('Stable')).toBeInTheDocument();
  });
});
