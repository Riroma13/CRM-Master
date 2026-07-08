import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleEditor } from './schedule-editor';
import type { DaySchedule } from '@/lib/api-types';

describe('ScheduleEditor', () => {
  const schedule: DaySchedule[] = [
    { day: 1, start: '09:00', end: '14:00' },
    { day: 1, start: '16:00', end: '19:00' },
  ];

  it('renders day labels and schedule rows', () => {
    render(<ScheduleEditor schedule={schedule} onChange={vi.fn()} />);

    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16:00')).toBeInTheDocument();
  });

  it('adds a new schedule row for a day', () => {
    const onChange = vi.fn();
    render(<ScheduleEditor schedule={schedule} onChange={onChange} />);

    const addButtons = screen.getAllByText('+ Añadir horario');
    fireEvent.click(addButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      ...schedule,
      { day: 1, start: '09:00', end: '14:00' },
    ]);
  });

  it('removes a schedule row', () => {
    const onChange = vi.fn();
    render(<ScheduleEditor schedule={schedule} onChange={onChange} />);

    const removeButtons = screen.getAllByText('Quitar');
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith([{ day: 1, start: '16:00', end: '19:00' }]);
  });

  it('shows empty state when no schedule', () => {
    render(<ScheduleEditor schedule={[]} onChange={vi.fn()} />);

    expect(
      screen.getByText('No hay horarios configurados. Haz clic en un día para añadir horario.'),
    ).toBeInTheDocument();
  });

  it('filters out weekend days (Sat=6, Sun=0) from display', () => {
    const mixedSchedule: DaySchedule[] = [
      { day: 1, start: '09:00', end: '14:00' },
      { day: 6, start: '10:00', end: '13:00' }, // Saturday — should be filtered
      { day: 0, start: '11:00', end: '15:00' }, // Sunday — should be filtered
    ];
    const onChange = vi.fn();
    render(<ScheduleEditor schedule={mixedSchedule} onChange={onChange} />);

    // Only Monday (day 1) should have a row
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.queryByText('Sáb')).not.toBeInTheDocument();
    expect(screen.queryByText('Dom')).not.toBeInTheDocument();
    // onChange is NOT called on mount — weekends are silently dropped from display
    expect(onChange).not.toHaveBeenCalled();
  });

  it('only shows quick-add buttons for Mon–Fri', () => {
    render(<ScheduleEditor schedule={[]} onChange={vi.fn()} />);

    // Mon–Fri buttons should be shown
    expect(screen.getByText('+ Lun')).toBeInTheDocument();
    expect(screen.getByText('+ Mar')).toBeInTheDocument();
    expect(screen.getByText('+ Mié')).toBeInTheDocument();
    expect(screen.getByText('+ Jue')).toBeInTheDocument();
    expect(screen.getByText('+ Vie')).toBeInTheDocument();

    // Weekend buttons should NOT be shown
    expect(screen.queryByText('+ Sáb')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Dom')).not.toBeInTheDocument();
  });
});
