import { z } from '../../../node_modules/zod';

export const CreateClienteSchema = z.object({
  nombre: z.string().min(2),
  tipoNegocio: z.string().optional(),
  contactoPrincipal: z.string().optional(),
  estadoRelacion: z
    .enum(['Activo', 'En pausa', 'Cerrado', 'Prospecto'])
    .default('Activo'),
  saludGeneral: z.enum(['🟢', '🟡', '🔴']).default('🟢'),
  fechaInicio: z.string().datetime().optional(),
  notasGenerales: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdateClienteSchema = CreateClienteSchema.partial();

export const ClienteListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  salud: z.enum(['🟢', '🟡', '🔴']).optional(),
  estado: z.enum(['Activo', 'En pausa', 'Cerrado', 'Prospecto']).optional(),
  tag: z.string().optional(),
});

export class CreateClienteDto {
  nombre!: string;
  tipoNegocio?: string;
  contactoPrincipal?: string;
  estadoRelacion?: string;
  saludGeneral?: string;
  fechaInicio?: string;
  notasGenerales?: string;
  tags?: string[];
}

export class UpdateClienteDto {
  nombre?: string;
  tipoNegocio?: string;
  contactoPrincipal?: string;
  estadoRelacion?: string;
  saludGeneral?: string;
  notasGenerales?: string;
  tags?: string[];
}

export interface ClienteCardDto {
  id: string;
  nombre: string;
  tenant: { id: string; slug: string; name: string };
  saludGeneral: string;
  estadoRelacion: string;
  tags: string[];
  sistemas?: Array<{
    id: string;
    nombreSistema: string;
    tipo: string;
    estadoTecnico: string;
  }>;
  ultimaActividad?: string;
  tareasPendientes?: number;
  createdAt: string;
}
