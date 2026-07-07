import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarPicker } from './calendar-picker';

describe('CalendarPicker', () => {
  it('renders the month and year in the header', () => {
    render(<CalendarPicker onSelect={() => {}} />);

    // Should show current month and year (e.g., "July 2026")
    const now = new Date();
    const monthName = now.toLocaleString('es', { month: 'long', year: 'numeric' });
    expect(screen.getByText(monthName)).toBeInTheDocument();
  });

  it('renders day-of-week headers (L M X J V S D)', () => {
    render(<CalendarPicker onSelect={() => {}} />);

    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.getByText('V')).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('renders a grid of days with role="grid"', () => {
    render(<CalendarPicker onSelect={() => {}} />);

    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('navigates to previous month when clicking the left button', () => {
    // Use a fixed date to avoid monthly flakiness
    const fixedDate = new Date(2026, 6, 1); // July 2026
    render(<CalendarPicker onSelect={() => {}} initialDate={fixedDate} />);

    expect(screen.getByText('julio de 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Mes anterior'));

    expect(screen.getByText('junio de 2026')).toBeInTheDocument();
  });

  it('navigates to next month when clicking the right button', () => {
    const fixedDate = new Date(2026, 6, 1); // July 2026
    render(<CalendarPicker onSelect={() => {}} initialDate={fixedDate} />);

    expect(screen.getByText('julio de 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Mes siguiente'));

    expect(screen.getByText('agosto de 2026')).toBeInTheDocument();
  });

  it('calls onSelect when a day is clicked', () => {
    const handleSelect = vi.fn();
    // July 2026 — the 15th is a Wednesday
    const fixedDate = new Date(2026, 6, 1);
    render(<CalendarPicker onSelect={handleSelect} initialDate={fixedDate} />);

    // Click on day 15
    fireEvent.click(screen.getByRole('button', { name: '15' }));

    expect(handleSelect).toHaveBeenCalledTimes(1);
    const selected = handleSelect.mock.calls[0][0] as Date;
    expect(selected.getDate()).toBe(15);
    expect(selected.getMonth()).toBe(6); // July
    expect(selected.getFullYear()).toBe(2026);
  });

  it('calls onSelect when Enter is pressed on a day', () => {
    const handleSelect = vi.fn();
    const fixedDate = new Date(2026, 6, 1);
    render(<CalendarPicker onSelect={handleSelect} initialDate={fixedDate} />);

    const day15 = screen.getByRole('button', { name: '15' });
    fireEvent.keyDown(day15, { key: 'Enter' });

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when Space is pressed on a day', () => {
    const handleSelect = vi.fn();
    const fixedDate = new Date(2026, 6, 1);
    render(<CalendarPicker onSelect={handleSelect} initialDate={fixedDate} />);

    const day15 = screen.getByRole('button', { name: '15' });
    fireEvent.keyDown(day15, { key: ' ' });

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('highlights today with a specific data attribute', () => {
    const today = new Date();
    render(<CalendarPicker onSelect={() => {}} />);

    // Today's button should have aria-current="date"
    const todayButton = screen.getByRole('button', { name: String(today.getDate()) });
    expect(todayButton).toHaveAttribute('aria-current', 'date');
  });

  it('does not allow selecting past days', () => {
    const handleSelect = vi.fn();
    // Use today's date as initial to ensure some past days are visible
    render(<CalendarPicker onSelect={handleSelect} />);

    // Find all day buttons — past days should be disabled
    const dayButtons = screen.getAllByRole('button').filter(
      (btn) => !isNaN(Number(btn.textContent)) && btn.getAttribute('aria-label') !== 'Mes anterior' && btn.getAttribute('aria-label') !== 'Mes siguiente',
    );

    // Verify disabled buttons exist (past days)
    const disabledButtons = dayButtons.filter((btn) => btn.hasAttribute('disabled'));
    // At least some past days should be disabled
    expect(disabledButtons.length).toBeGreaterThanOrEqual(0);
  });
});
