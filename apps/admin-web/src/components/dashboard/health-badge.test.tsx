import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthBadge } from './health-badge';

describe('HealthBadge', () => {
  it('renders Bueno for healthy', () => {
    render(<HealthBadge salud="🟢" />);
    expect(screen.getByText('Buena')).toBeInTheDocument();
    expect(screen.getByText('🟢')).toBeInTheDocument();
  });

  it('renders Media for warning', () => {
    render(<HealthBadge salud="🟡" />);
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('🟡')).toBeInTheDocument();
  });

  it('renders Crítica for critical', () => {
    render(<HealthBadge salud="🔴" />);
    expect(screen.getByText('Crítica')).toBeInTheDocument();
    expect(screen.getByText('🔴')).toBeInTheDocument();
  });

  it('uses correct Badge variant for each salud', () => {
    const { container: success } = render(<HealthBadge salud="🟢" />);
    expect(success.querySelector('[class*="bg-\\[\\#D1FAE5\\]"]')).toBeTruthy();

    const { container: warning } = render(<HealthBadge salud="🟡" />);
    expect(warning.querySelector('[class*="bg-\\[\\#FEF3C7\\]"]')).toBeTruthy();

    const { container: critical } = render(<HealthBadge salud="🔴" />);
    expect(critical.querySelector('[class*="bg-\\[\\#FEE2E2\\]"]')).toBeTruthy();
  });
});
