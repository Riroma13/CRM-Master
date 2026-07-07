import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotList } from './slot-list';
import type { Slot } from '@/lib/api-types';

const mockSlots: Slot[] = [
  { start: '2026-07-05T09:00:00Z', end: '2026-07-05T09:30:00Z', available: true },
  { start: '2026-07-05T09:30:00Z', end: '2026-07-05T10:00:00Z', available: true },
  { start: '2026-07-05T10:00:00Z', end: '2026-07-05T10:30:00Z', available: false },
  { start: '2026-07-05T11:00:00Z', end: '2026-07-05T11:30:00Z', available: true },
];

describe('SlotList', () => {
  it('renders a list of available slots', () => {
    render(<SlotList slots={mockSlots} onSelect={() => {}} />);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('shows time range for each slot', () => {
    render(<SlotList slots={mockSlots} onSelect={() => {}} />);

    expect(screen.getAllByText('09:00')).toHaveLength(1);
    expect(screen.getAllByText('09:30')).toHaveLength(2);
    expect(screen.getAllByText('10:00')).toHaveLength(2);
    expect(screen.getAllByText('10:30')).toHaveLength(1);
    expect(screen.getAllByText('11:00')).toHaveLength(1);
    expect(screen.getAllByText('11:30')).toHaveLength(1);
  });

  it('marks unavailable slots as disabled', () => {
    render(<SlotList slots={mockSlots} onSelect={() => {}} />);

    const options = screen.getAllByRole('option');
    // Third slot (index 2) is unavailable
    expect(options[2]).toHaveAttribute('aria-disabled', 'true');
  });

  it('calls onSelect when a slot is clicked', () => {
    const handleSelect = vi.fn();
    render(<SlotList slots={mockSlots} onSelect={handleSelect} />);

    fireEvent.click(screen.getAllByRole('option')[0]);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockSlots[0]);
  });

  it('does not call onSelect when an unavailable slot is clicked', () => {
    const handleSelect = vi.fn();
    render(<SlotList slots={mockSlots} onSelect={handleSelect} />);

    fireEvent.click(screen.getAllByRole('option')[2]);

    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('marks selected slot with aria-selected', () => {
    render(<SlotList slots={mockSlots} onSelect={() => {}} selectedSlot={mockSlots[0]} />);

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).not.toHaveAttribute('aria-selected', 'true');
  });

  it('shows loading state', () => {
    render(<SlotList slots={[]} onSelect={() => {}} isLoading={true} />);

    expect(screen.getByText('Cargando horarios...')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows empty state when no slots are available', () => {
    render(<SlotList slots={[]} onSelect={() => {}} />);

    expect(screen.getByText('No hay horarios disponibles para esta fecha.')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
