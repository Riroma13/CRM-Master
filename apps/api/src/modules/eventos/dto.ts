import { z } from 'zod';

export const CreateEventoSchema = z.object({
  sistemaId: z.string().uuid(),
  tipo: z.enum(['Decisión', 'Cambio técnico', 'Incidencia', 'Reunión', 'Aprendizaje']),
  titulo: z.string().min(2),
  descripcion: z.string().optional(),
  siguienteAccion: z.string().optional(),
});

export const EventoListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tipo: z.enum(['Decisión', 'Cambio técnico', 'Incidencia', 'Reunión', 'Aprendizaje']).optional(),
});

export class CreateEventoDto {
  sistemaId!: string;
  tipo!: string;
  titulo!: string;
  descripcion?: string;
  siguienteAccion?: string;
}
