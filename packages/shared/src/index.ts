import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────

export const EstadoRelacion = z.enum(['Activo', 'En pausa', 'Cerrado', 'Prospecto']);
export type EstadoRelacion = z.infer<typeof EstadoRelacion>;

export const SaludGeneral = z.enum(['🟢', '🟡', '🔴']);
export type SaludGeneral = z.infer<typeof SaludGeneral>;

export const TipoSistema = z.enum(['BeeHive propio', 'CRM terceros', 'Híbrido', 'Otro']);
export type TipoSistema = z.infer<typeof TipoSistema>;

export const EstadoTecnico = z.enum(['🟢', '🟡', '🔴', '⚪']);
export type EstadoTecnico = z.infer<typeof EstadoTecnico>;

export const EstadoItem = z.enum(['Implementado', 'Parcial', 'Planeado', 'Obsoleto']);
export type EstadoItem = z.infer<typeof EstadoItem>;

export const TipoEvento = z.enum(['Decisión', 'Cambio técnico', 'Incidencia', 'Reunión', 'Aprendizaje']);
export type TipoEvento = z.infer<typeof TipoEvento>;

export const EstadoTarea = z.enum(['Pendiente', 'En curso', 'Hecho']);
export type EstadoTarea = z.infer<typeof EstadoTarea>;

export const PrioridadTarea = z.enum(['Alta', 'Media', 'Baja']);
export type PrioridadTarea = z.infer<typeof PrioridadTarea>;

// ─── DTOs ───────────────────────────────────────────────────────────

export const CreateClienteSchema = z.object({
  nombre: z.string().min(2),
  tipoNegocio: z.string().optional(),
  contactoPrincipal: z.string().optional(),
  estadoRelacion: EstadoRelacion.default('Activo'),
  saludGeneral: SaludGeneral.default('🟢'),
  fechaInicio: z.string().datetime().optional(),
  notasGenerales: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdateClienteSchema = CreateClienteSchema.partial();

export const CreateSistemaSchema = z.object({
  clienteId: z.string().uuid(),
  nombreSistema: z.string().min(2),
  tipo: TipoSistema,
  entorno: z.string().optional(),
  version: z.string().optional(),
  estadoTecnico: EstadoTecnico.default('🟢'),
  credencialesRef: z.string().optional(),
});

export const CreateEventoSchema = z.object({
  sistemaId: z.string().uuid(),
  tipo: TipoEvento,
  titulo: z.string().min(2),
  descripcion: z.string().optional(),
  siguienteAccion: z.string().optional(),
});

export const CreateTareaSchema = z.object({
  clienteId: z.string().uuid().optional(),
  sistemaId: z.string().uuid().optional(),
  titulo: z.string().min(2),
  estado: EstadoTarea.default('Pendiente'),
  prioridad: PrioridadTarea.default('Media'),
  fechaLimite: z.string().datetime().optional(),
});

// ─── Activity Timeline ──────────────────────────────────────────────

export * from './activity-timeline';

// ─── Client Auth ─────────────────────────────────────────────────────

export * from './client-auth';

// ─── Search (Universal Search 2.0) ────────────────────────────────────

export * from './search';

// ─── Automation (AI Automation Hub) ────────────────────────────────────

export * from './automation';

