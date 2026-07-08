import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScrollArea } from './scroll-area';
import * as React from 'react';

describe('ScrollArea', () => {
  it('renders with children', () => {
    render(
      <ScrollArea data-testid="scroll">
        <div>Scrollable content</div>
      </ScrollArea>,
    );
    expect(screen.getByText('Scrollable content')).toBeInTheDocument();
  });
});
