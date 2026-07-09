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
  onboardingChecklist?: { steps: { id: string; label: string; done: boolean }[] };
}
