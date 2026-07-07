'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Cita, Slot } from '@/lib/api-types';
import { useSlots } from '@/hooks/use-slots';
import { CalendarPicker } from './components/calendar-picker';
import { SlotList } from './components/slot-list';
import { BookingForm } from './components/booking-form';
import { BookingConfirmation } from './components/booking-confirmation';

type Step = 'calendar' | 'slots' | 'form' | 'confirmation';

export default function CalendarioPage() {
  const [step, setStep] = useState<Step>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [createdCita, setCreatedCita] = useState<Cita | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { slots, isLoading: slotsLoading, isError: slotsError } = useSlots(selectedDate);

  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep('slots');
  }, []);

  const handleSlotSelect = useCallback((slot: Slot) => {
    setSelectedSlot(slot);
    setStep('form');
  }, []);

  const handleBookingSubmit = useCallback(async (data: {
    clienteNombre: string;
    clienteEmail: string;
    clienteTelefono?: string;
    descripcion?: string;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const cita = await api.post<Cita>('/api/v1/tenant/calendario/citas', {
        ...data,
        fecha: selectedSlot?.start,
      });
      setCreatedCita(cita);
      setStep('confirmation');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Error al crear la cita',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSlot]);

  const handleReset = useCallback(() => {
    setStep('calendar');
    setSelectedDate(null);
    setSelectedSlot(null);
    setCreatedCita(null);
    setSubmitError(null);
  }, []);

  return (
    <div className="min-h-screen bg-[--color-surface] py-12">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-2xl font-semibold text-[--color-on-surface] text-center mb-8">
          Agenda una cita
        </h1>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {(['calendar', 'slots', 'form'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  getStepIndex(step) >= i
                    ? 'bg-[--color-primary-container] text-white'
                    : 'bg-[--color-surface-container] text-[--color-on-surface-variant]',
                )}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    'h-px w-8',
                    getStepIndex(step) > i
                      ? 'bg-[--color-primary-container]'
                      : 'bg-[--color-border-subtle]',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-[0.5rem] border border-[--color-border-subtle] shadow-ambient p-6">
          {step === 'calendar' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[--color-on-surface-variant] text-center">
                Selecciona una fecha
              </p>
              <div className="flex justify-center">
                <CalendarPicker onSelect={handleDateSelect} />
              </div>
            </div>
          )}

          {step === 'slots' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[--color-on-surface-variant] text-center">
                Selecciona un horario
              </p>
              {slotsError && (
                <p className="text-sm text-[--color-critical] text-center">
                  Error al cargar los horarios. Intenta de nuevo.
                </p>
              )}
              <SlotList
                slots={slots}
                onSelect={handleSlotSelect}
                isLoading={slotsLoading}
              />
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[--color-on-surface-variant] text-center">
                Completa tus datos
              </p>
              {submitError && (
                <p className="text-sm text-[--color-critical] text-center" role="alert">
                  {submitError}
                </p>
              )}
              <BookingForm onSubmit={handleBookingSubmit} isLoading={isSubmitting} />
            </div>
          )}

          {step === 'confirmation' && createdCita && (
            <BookingConfirmation cita={createdCita} onReset={handleReset} />
          )}
        </div>
      </div>
    </div>
  );
}

function getStepIndex(step: Step): number {
  switch (step) {
    case 'calendar':
      return 0;
    case 'slots':
      return 1;
    case 'form':
      return 2;
    case 'confirmation':
      return 3;
  }
}


