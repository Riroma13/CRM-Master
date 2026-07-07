import { z } from 'zod';

export const BookCitaSchema = z.object({
  fecha: z.string().datetime(),
  clienteNombre: z.string().min(2).optional(),
  clienteEmail: z.string().email().optional(),
  clienteTelefono: z.string().optional(),
  descripcion: z.string().max(500).optional(),
});

export const UpdateCitaSchema = z.object({
  estado: z.enum(['confirmada', 'cancelada', 'completada']),
  notasInternas: z.string().optional(),
});

const DailyScheduleEntry = z.object({
  day: z.number().int().min(0).max(6),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const DisponibilidadSchema = z.object({
  timezone: z.string().default('Europe/Madrid'),
  slotDuration: z.number().int().min(15).max(120).default(30),
  minNotice: z.number().int().min(60).max(4320).default(240),
  maxDays: z.number().int().min(7).max(90).default(30),
  dailySchedule: z.array(DailyScheduleEntry),
  blockedDates: z.array(z.string()).default([]),
});

export class BookCitaDto {
  fecha!: string;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcion?: string;
}

export class UpdateCitaDto {
  estado!: 'confirmada' | 'cancelada' | 'completada';
  notasInternas?: string;
}

export class DisponibilidadDto {
  timezone!: string;
  slotDuration!: number;
  minNotice!: number;
  maxDays!: number;
  dailySchedule!: { day: number; start: string; end: string }[];
  blockedDates?: string[];
}

export interface DailyScheduleEntry {
  day: number;
  start: string;
  end: string;
}
