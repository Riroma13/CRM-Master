'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CalendarPickerProps {
  onSelect: (date: Date) => void;
  initialDate?: Date;
}

const DAYS_OF_WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1);
  // 0=Sun, 1=Mon, ... 6=Sat → we want Monday-based (0=Mon, ... 6=Sun)
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6; // Sunday → last column

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  // Fill leading empty cells
  for (let i = 0; i < startDay; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill trailing empty cells
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

function isPastDay(year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function CalendarPicker({ onSelect, initialDate }: CalendarPickerProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate?.getMonth() ?? today.getMonth());

  const monthName = new Date(viewYear, viewMonth).toLocaleString('es', {
    month: 'long',
    year: 'numeric',
  });

  const weeks = getMonthGrid(viewYear, viewMonth);

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const handleDayClick = useCallback(
    (day: number) => {
      onSelect(new Date(viewYear, viewMonth, day));
    },
    [onSelect, viewYear, viewMonth],
  );

  const handleDayKeyDown = useCallback(
    (e: React.KeyboardEvent, day: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(new Date(viewYear, viewMonth, day));
      }
    },
    [onSelect, viewYear, viewMonth],
  );

  return (
    <div className="w-full max-w-xs" data-testid="calendar-picker">
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          aria-label="Mes anterior"
          className="h-8 w-8 p-0"
        >
          ‹
        </Button>
        <span className="text-sm font-semibold capitalize text-[--color-on-surface]">
          {monthName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          aria-label="Mes siguiente"
          className="h-8 w-8 p-0"
        >
          ›
        </Button>
      </div>

      {/* Day-of-week header */}
      <div role="grid" aria-label="Calendario de citas">
        <div role="row" className="grid grid-cols-7 mb-1">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-[--color-on-surface-variant] py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        {weeks.map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7">
            {week.map((day, di) => {
              if (day === null) {
                return <div key={`empty-${wi}-${di}`} role="gridcell" className="p-1" />;
              }

              const today = isToday(viewYear, viewMonth, day);
              const past = isPastDay(viewYear, viewMonth, day);

              return (
                <div key={day} role="gridcell" className="p-0.5">
                  <button
                    type="button"
                    role="button"
                    disabled={past}
                    aria-label={String(day)}
                    aria-current={today ? 'date' : undefined}
                    onClick={() => handleDayClick(day)}
                    onKeyDown={(e) => handleDayKeyDown(e, day)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center rounded-[0.25rem] text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary-container] focus-visible:ring-offset-1',
                      today &&
                        'bg-[--color-primary-container] text-white font-semibold',
                      !today &&
                        !past &&
                        'text-[--color-on-surface] hover:bg-[--color-surface-container]',
                      !today && past && 'text-[--color-on-surface-variant]/40 cursor-not-allowed',
                    )}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
