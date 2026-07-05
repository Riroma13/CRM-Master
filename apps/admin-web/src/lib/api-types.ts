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
