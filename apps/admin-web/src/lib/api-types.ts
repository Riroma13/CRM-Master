// ─── Dashboard Metrics ─────────────────────────────────────────

export interface DashboardMetrics {
  metrics: {
    totalClientes: number;
    activos: number;
    conIncidencias: number;
    criticos: number;
    tareasPendientesGlobales: number;
    tenantsActivos: number;
  };
  ultimaActualizacion: string;
}

// ─── Client List ──────────────────────────────────────────────

export interface ClienteListItem {
  id: string;
  nombre: string;
  tenant: { id: string; slug: string; name: string };
  saludGeneral: '🟢' | '🟡' | '🔴';
  estadoRelacion: string;
  tags: string[];
  sistemas: Array<{
    id: string;
    nombreSistema: string;
    tipo: string;
    estadoTecnico: string;
  }>;
  ultimaActividad: string;
  tareasPendientes: number;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClientListResponse {
  data: ClienteListItem[];
  pagination: PaginationMeta;
}

// ─── Filters ──────────────────────────────────────────────────

export interface ClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  salud?: '🟢' | '🟡' | '🔴';
  estado?: string;
  tag?: string;
}

// ─── Client Detail (SPEC-0004) ────────────────────────────────

export interface ClienteDetail {
  id: string;
  nombre: string;
  tipoNegocio: string | null;
  contactoPrincipal: string | null;
  estadoRelacion: string;
  saludGeneral: string;
  fechaInicio: string | null;
  notasGenerales: string | null;
  tags: string[];
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  sistemas: SistemaDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface SistemaDetail {
  id: string;
  nombreSistema: string;
  tipo: string;
  entorno: string | null;
  version: string | null;
  estadoTecnico: string;
  fechaUltimoChequeo: string | null;
  items: Array<{
    id: string;
    categoria: string;
    nombre: string;
    estado: string;
    responsable: string | null;
  }>;
}

export interface EventoItem {
  id: string;
  sistema: {
    id: string;
    nombreSistema: string;
  };
  fecha: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  siguienteAccion: string | null;
}

export interface TareaItem {
  id: string;
  titulo: string;
  estado: string;
  prioridad: string;
  fechaLimite: string | null;
  sistema: {
    id: string;
    nombreSistema: string;
  } | null;
}

export interface CreateEventoInput {
  sistemaId: string;
  tipo: string;
  titulo: string;
  descripcion?: string;
  siguienteAccion?: string;
}

export interface CreateTareaInput {
  sistemaId?: string;
  titulo: string;
  prioridad?: string;
  fechaLimite?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
}
