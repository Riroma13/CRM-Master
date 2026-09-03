import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataRow } from './data-row';
import { PageHeader } from './page-header';
import { StatePanel } from './state-panel';
import { StatusBadge } from './status-badge';

describe('foundation components', () => {
  it('renders a responsive page header with an action', () => {
    render(
      <PageHeader
        title="Systems"
        description="Manage your connected systems."
        action={<button type="button">Add system</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Systems' })).toBeInTheDocument();
    expect(screen.getByText('Manage your connected systems.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add system' })).toBeInTheDocument();
  });

  it.each([
    ['active', 'Active'],
    ['pending', 'Pending'],
    ['failed', 'Failed'],
  ])('renders the semantic %s status label', (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders labelled loading, empty, filtered-empty, and retryable error states', () => {
    const retry = vi.fn();

    const { rerender } = render(<StatePanel state="loading" label="Systems" />);
    expect(screen.getByRole('status', { name: 'Loading Systems' })).toBeInTheDocument();

    rerender(<StatePanel state="empty" title="No systems yet" description="Create one to begin." />);
    expect(screen.getByRole('status')).toHaveTextContent('No systems yet');

    rerender(<StatePanel state="filtered-empty" title="No matching systems" />);
    expect(screen.getByRole('status')).toHaveTextContent('No matching systems');

    rerender(<StatePanel state="error" title="Unable to load systems" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load systems');
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders desktop row semantics and labelled mobile card fields', () => {
    render(
      <DataRow
        label="System Alpha"
        href="/admin/sistemas/alpha"
        cells={[
          { label: 'Status', value: <StatusBadge status="active" /> },
          { label: 'Client', value: 'Acme Corp' },
        ]}
      />,
    );

    expect(screen.getByRole('row', { name: /System Alpha/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'System Alpha' })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: 'System Alpha' })) {
      expect(link).toHaveAttribute('href', '/admin/sistemas/alpha');
    }
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getAllByText('Acme Corp')).toHaveLength(2);
  });
});
