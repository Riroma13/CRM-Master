import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarLayout } from './sidebar-layout';

// Mock the Sidebar component
vi.mock('./sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

describe('SidebarLayout', () => {
  it('renders sidebar and children', () => {
    render(
      <SidebarLayout>
        <div data-testid="content">Main Content</div>
      </SidebarLayout>,
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });
});
