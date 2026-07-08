'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Cita } from '@/lib/api-types';

interface BookingConfirmationProps {
  cita: Cita;
  onReset: () => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function BookingConfirmation({ cita, onReset }: BookingConfirmationProps) {
  return (
    <Card className="max-w-md mx-auto text-center">
      <CardContent className="pt-8 pb-6 space-y-4">
        {/* Success icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[--color-success]/10">
          <svg
            className="h-7 w-7 text-[--color-success]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-[--color-on-surface]">
            Cita confirmada
          </h2>
          <p className="text-sm text-[--color-on-surface-variant] mt-1">
            Tu cita ha sido agendada correctamente
          </p>
        </div>

        {/* Cita details */}
        <div className="bg-[--color-surface-container-low] rounded-[0.25rem] p-4 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-[--color-on-surface-variant]">Fecha</span>
            <span className="font-medium text-[--color-on-surface]">
              {formatDate(cita.fecha)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[--color-on-surface-variant]">Hora</span>
            <span className="font-medium text-[--color-on-surface]">
              {formatTime(cita.fecha)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[--color-on-surface-variant]">Duración</span>
            <span className="font-medium text-[--color-on-surface]">
              {cita.duracion} min
            </span>
          </div>
          {cita.clienteNombre && (
            <div className="flex justify-between text-sm">
              <span className="text-[--color-on-surface-variant]">Cliente</span>
              <span className="font-medium text-[--color-on-surface]">
                {cita.clienteNombre}
              </span>
            </div>
          )}
          {cita.clienteEmail && (
            <div className="flex justify-between text-sm">
              <span className="text-[--color-on-surface-variant]">Email</span>
              <span className="font-medium text-[--color-on-surface]">
                {cita.clienteEmail}
              </span>
            </div>
          )}
        </div>

        {/* Confirmation number */}
        <div className="text-xs text-[--color-on-surface-variant]">
          Nº de confirmación: <span className="font-mono font-medium">{cita.id}</span>
        </div>

        {/* Reset button */}
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full"
        >
          Volver al inicio
        </Button>
      </CardContent>
    </Card>
  );
}
