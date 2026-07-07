export interface Slot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface BookSlotInput {
  fecha: Date;
  duracion: number;
  clienteNombre?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcion?: string;
}

export interface CalendarProvider {
  getSlots(tenantId: string, date: Date): Promise<Slot[]>;
  bookSlot(tenantId: string, input: BookSlotInput): Promise<CitaResult>;
  confirmCita(citaId: string): Promise<CitaResult>;
  cancelCita(citaId: string): Promise<CitaResult>;
}

export interface CitaResult {
  id: string;
  tenantId: string;
  fecha: Date;
  duracion: number;
  estado: string;
  clienteNombre?: string | null;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  descripcion?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
