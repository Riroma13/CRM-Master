import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button, Card, CardContent, Badge } from '@crm-master/ui';

describe('@crm-master/ui integration', () => {
  it('Button renders and matches snapshot', () => {
    const { container } = render(<Button variant="default" size="default">Test Button</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Card renders and matches snapshot', () => {
    const { container } = render(
      <Card>
        <CardContent>Test Card</CardContent>
      </Card>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Badge renders and matches snapshot', () => {
    const { container } = render(<Badge variant="default">Test Badge</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
