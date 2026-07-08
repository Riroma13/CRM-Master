'use client';

import { cn } from '@/lib/utils';
import type { Slot } from '@/lib/api-types';

interface SlotListProps {
  slots: Slot[];
  onSelect: (slot: Slot) => void;
  selectedSlot?: Slot | null;
  isLoading?: boolean;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function SlotList({ slots, onSelect, selectedSlot, isLoading }: SlotListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-[--color-on-surface-variant]">
        Cargando horarios...
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[--color-on-surface-variant]">
        No hay horarios disponibles para esta fecha.
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Horarios disponibles"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {slots.map((slot) => {
        const isSelected = selectedSlot?.start === slot.start;
        const isDisabled = !slot.available;

        return (
          <button
            key={slot.start}
            type="button"
            role="option"
            aria-selected={isSelected || undefined}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) {
                onSelect(slot);
              }
            }}
            className={cn(
              'flex flex-col items-center rounded-[0.25rem] border px-3 py-2 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary-container] focus-visible:ring-offset-1',
              isSelected && 'border-[--color-primary-container] bg-[--color-primary-container] text-white',
              !isSelected && !isDisabled && 'border-[--color-border-subtle] bg-white text-[--color-on-surface] hover:bg-[--color-surface-container]',
              isDisabled && 'border-[--color-border-subtle] bg-[--color-surface-container-low] text-[--color-on-surface-variant]/50 cursor-not-allowed',
            )}
          >
            <span className="font-medium">{formatTime(slot.start)}</span>
            <span className="text-[11px] opacity-70">
              {formatTime(slot.end)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
