import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription, Badge, DashboardLayout } from '../index';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('renders with variant and size props', () => {
    render(<Button variant="destructive" size="lg">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toBeInTheDocument();
  });

  it('renders as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
  });

  it('accepts className for custom styling', () => {
    render(<Button className="custom-class">Styled</Button>);
    const button = screen.getByRole('button', { name: /styled/i });
    expect(button.className).toContain('custom-class');
  });
});

describe('Card', () => {
  it('renders Card with children', () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
  });

  it('renders Card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('accepts className on Card', () => {
    render(<Card className="custom-card">Content</Card>);
    expect(screen.getByText('Content').className).toContain('custom-card');
  });
});

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
  });

  it('renders with all variant props', () => {
    const variants = ['default', 'secondary', 'destructive', 'success', 'warning', 'critical', 'outline'] as const;
    for (const variant of variants) {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    }
  });

  it('accepts className', () => {
    render(<Badge className="custom-badge">Tag</Badge>);
    expect(screen.getByText('Tag').className).toContain('custom-badge');
  });
});

describe('DashboardLayout', () => {
  it('renders with children', () => {
    render(
      <DashboardLayout>
        <div>Page Content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders sidebar with nav items', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByText('Global Inventory')).toBeInTheDocument();
  });
});

describe('Type safety', () => {
  it('should not export non-existent names', async () => {
    const mod = await import('../index');
    expect((mod as Record<string, unknown>)['NonExistent']).toBeUndefined();
  });
});

describe('Backward compatibility with admin-web usage', () => {
  it('Button accepts all props used in admin-web', () => {
    const adminWebUsages: Array<{ variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'; size?: 'default' | 'sm' | 'lg' | 'icon' }> = [
      { variant: 'default', size: 'default' },
      { variant: 'outline', size: 'sm' },
      { variant: 'destructive', size: 'lg' },
      { variant: 'ghost', size: 'icon' },
    ];
    for (const props of adminWebUsages) {
      const { unmount } = render(<Button {...props}>Admin Button</Button>);
      expect(screen.getByText('Admin Button')).toBeInTheDocument();
      unmount();
    }
  });

  it('Badge accepts all variant values used in admin-web', () => {
    render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
