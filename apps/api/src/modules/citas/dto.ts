import { IsString, IsEmail, IsOptional, MaxLength, MinLength, IsIn, IsInt, Min, Max, IsArray, IsNumber, ArrayMinSize } from 'class-validator';
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
  @IsString()
  fecha!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  clienteNombre?: string;

  @IsOptional()
  @IsEmail()
  clienteEmail?: string;

  @IsOptional()
  @IsString()
  clienteTelefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class UpdateCitaDto {
  @IsString()
  @IsIn(['confirmada', 'cancelada', 'completada'])
  estado!: 'confirmada' | 'cancelada' | 'completada';

  @IsOptional()
  @IsString()
  notasInternas?: string;
}

export class DisponibilidadDto {
  @IsString()
  timezone!: string;

  @IsInt()
  @Min(15)
  @Max(120)
  slotDuration!: number;

  @IsInt()
  @Min(60)
  @Max(4320)
  minNotice!: number;

  @IsInt()
  @Min(7)
  @Max(90)
  maxDays!: number;

  @IsArray()
  @ArrayMinSize(1)
  dailySchedule!: { day: number; start: string; end: string }[];

  @IsOptional()
  @IsArray()
  blockedDates?: string[];
}

export interface DailyScheduleEntry {
  day: number;
  start: string;
  end: string;
}
