import { z } from 'zod';

export const CreateTareaRapidaSchema = z.object({
  sistemaId: z.string().uuid().optional(),
  titulo: z.string().min(2),
  prioridad: z.enum(['Alta', 'Media', 'Baja']).default('Media'),
  fechaLimite: z.string().datetime().optional(),
});

export const TareaListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(['Pendiente', 'En curso', 'Hecho']).optional(),
});

export class CreateTareaDto {
  sistemaId?: string;
  titulo!: string;
  prioridad?: string;
  fechaLimite?: string;
}
