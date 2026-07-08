import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Separator } from './separator';
import * as React from 'react';

describe('Separator', () => {
  it('renders as a horizontal separator by default', () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId('sep')).toBeInTheDocument();
  });

  it('renders as a vertical separator', () => {
    render(<Separator orientation="vertical" data-testid="sep-vert" />);
    expect(screen.getByTestId('sep-vert')).toBeInTheDocument();
  });
});
