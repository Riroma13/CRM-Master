'use client';

import { useCallback, useState } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
/** Form data without fecha — the page adds fecha before submitting to the API. */
interface BookingFormData {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string;
  descripcion?: string;
}

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => void;
  isLoading?: boolean;
}

const BookingFormSchema = z.object({
  clienteNombre: z.string().min(1, 'El nombre es obligatorio'),
  clienteEmail: z.string().min(1, 'El email es obligatorio').email('El email no es válido'),
  clienteTelefono: z.string().optional(),
  descripcion: z
    .string()
    .max(500, 'La descripción no puede superar los 500 caracteres')
    .optional(),
});

type FormData = z.infer<typeof BookingFormSchema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

export function BookingForm({ onSubmit, isLoading }: BookingFormProps) {
  const [formData, setFormData] = useState<FormData>({
    clienteNombre: '',
    clienteEmail: '',
    clienteTelefono: '',
    descripcion: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const handleChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const result = BookingFormSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: FormErrors = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof FormData;
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }

      setErrors({});
      onSubmit(result.data);
    },
    [formData, onSubmit],
  );

  const errorId = (field: keyof FormData) =>
    errors[field] ? `${field}-error` : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate data-testid="booking-form">
      <div>
        <label
          htmlFor="clienteNombre"
          className="block text-sm font-medium text-[--color-on-surface] mb-1"
        >
          Nombre <span className="text-[--color-critical]">*</span>
        </label>
        <Input
          id="clienteNombre"
          value={formData.clienteNombre}
          onChange={handleChange('clienteNombre')}
          aria-describedby={errorId('clienteNombre')}
          aria-invalid={!!errors.clienteNombre}
          placeholder="Tu nombre"
        />
        {errors.clienteNombre && (
          <p id="clienteNombre-error" className="text-xs text-[--color-critical] mt-1" role="alert">
            {errors.clienteNombre}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="clienteEmail"
          className="block text-sm font-medium text-[--color-on-surface] mb-1"
        >
          Email <span className="text-[--color-critical]">*</span>
        </label>
        <Input
          id="clienteEmail"
          type="email"
          value={formData.clienteEmail}
          onChange={handleChange('clienteEmail')}
          aria-describedby={errorId('clienteEmail')}
          aria-invalid={!!errors.clienteEmail}
          placeholder="tu@email.com"
        />
        {errors.clienteEmail && (
          <p id="clienteEmail-error" className="text-xs text-[--color-critical] mt-1" role="alert">
            {errors.clienteEmail}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="clienteTelefono"
          className="block text-sm font-medium text-[--color-on-surface] mb-1"
        >
          Teléfono
        </label>
        <Input
          id="clienteTelefono"
          type="tel"
          value={formData.clienteTelefono ?? ''}
          onChange={handleChange('clienteTelefono')}
          placeholder="+34 600 123 456"
        />
      </div>

      <div>
        <label
          htmlFor="descripcion"
          className="block text-sm font-medium text-[--color-on-surface] mb-1"
        >
          Descripción
        </label>
        <textarea
          id="descripcion"
          value={formData.descripcion ?? ''}
          onChange={handleChange('descripcion')}
          aria-describedby={errorId('descripcion')}
          aria-invalid={!!errors.descripcion}
          placeholder="Breve descripción de la consulta (opcional)"
          rows={3}
          maxLength={500}
          className={cn(
            'flex w-full rounded-[0.25rem] border border-[--color-border-subtle] bg-white px-3 py-2 text-sm text-[--color-on-surface]',
            'ring-offset-white placeholder:text-[--color-on-surface-variant]/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-primary-container]/20 focus-visible:border-[--color-primary-container]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none',
          )}
        />
        <div className="flex justify-between mt-1">
          {errors.descripcion && (
            <p id="descripcion-error" className="text-xs text-[--color-critical]" role="alert">
              {errors.descripcion}
            </p>
          )}
          <span className="text-xs text-[--color-on-surface-variant] ml-auto">
            {(formData.descripcion ?? '').length}/500
          </span>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Confirmando...' : 'Confirmar cita'}
      </Button>
    </form>
  );
}
