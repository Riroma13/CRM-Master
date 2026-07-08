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
}
