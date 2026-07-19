// ─── Slot types ───────────────────────────────────────────────

export interface Slot {
  start: string;
  end: string;
  available: boolean;
}

// ─── Cita types ───────────────────────────────────────────────

export type CitaEstado = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface Cita {
  id: string;
  tenantId: string;
  fecha: string;
  duracion: number;
  estado: CitaEstado;
  titulo: string;
  descripcion?: string;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  notasInternas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitaListResponse {
  citas: Cita[];
  total: number;
}

// ─── Booking types ────────────────────────────────────────────

export interface BookCitaInput {
  fecha: string;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcion?: string;
}

// ─── Disponibilidad types ─────────────────────────────────────

export interface DaySchedule {
  day: number;
  start: string;
  end: string;
}

export interface DisponibilidadConfig {
  timezone: string;
  slotDuration: number;
  minNotice: number;
  maxDays: number;
  dailySchedule: DaySchedule[];
  blockedDates: string[];
}

// ─── Dashboard types ─────────────────────────────────────────

export interface EventoItem {
  id: string;
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  link?: string;
}

export interface TenantDashboardResponse {
  totalClientes: number;
  clientesActivos: number;
  citasHoy: number;
  citasPendientes: number;
  citasSemana: number;
  tareasPendientes: number;
  sistemasActivos: number;
  eventosRecientes: EventoItem[];
  onboardingChecklist?: { steps: { id: string; label: string; done: boolean }[] };
}

// ─── Documento types ──────────────────────────────────────────

export type DocumentCategory = 'contrato' | 'factura' | 'informe' | 'modelo' | 'otro';

export interface DocumentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  description?: string;
  storageKey: string;
  createdAt: string;
  shareLinks?: ShareLinkDto[];
}

export interface ShareLinkDto {
  id: string;
  token: string;
  url: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount: number;
  createdAt: string;
}

// ─── Search (SPEC-0010) ─────────────────────────────────────

export interface SearchResultItem {
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  tags?: string[];
  matchField?: string;
  score: number;
  url: string;
  createdAt: string;
}

export interface SearchGroup {
  entityType: string;
  label: string;
  icon: string;
  results: SearchResultItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
  total: number;
  query: string;
}
