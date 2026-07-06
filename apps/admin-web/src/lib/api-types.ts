// ─── Shared API types for admin-web ─────────────────────────────────

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
