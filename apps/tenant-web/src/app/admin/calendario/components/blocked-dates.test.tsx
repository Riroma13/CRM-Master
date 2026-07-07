import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockedDates } from './blocked-dates';

describe('BlockedDates', () => {
  it('renders list of blocked dates', () => {
    render(<BlockedDates dates={['2026-08-15', '2026-12-25']} onChange={vi.fn()} />);

    expect(screen.getByText('15 de agosto de 2026')).toBeInTheDocument();
    expect(screen.getByText('25 de diciembre de 2026')).toBeInTheDocument();
  });

  it('removes a date', () => {
    const onChange = vi.fn();
    render(<BlockedDates dates={['2026-08-15']} onChange={onChange} />);

    fireEvent.click(screen.getByText('Quitar'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows empty state', () => {
    render(<BlockedDates dates={[]} onChange={vi.fn()} />);

    expect(
      screen.getByText(
        'No hay fechas bloqueadas. Añade una fecha para bloquear el día completo.',
      ),
    ).toBeInTheDocument();
  });

  it('has a date input and block button', () => {
    render(<BlockedDates dates={[]} onChange={vi.fn()} />);

    const blockBtn = screen.getByText('Bloquear');
    expect(blockBtn).toBeInTheDocument();
    expect(blockBtn).toBeDisabled(); // disabled when no date value

    const inputs = document.querySelectorAll('input');
    expect(inputs.length).toBe(1);
    expect(inputs[0]).toHaveAttribute('type', 'date');
  });
});
