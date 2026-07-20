export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  category: 'domain' | 'schedule' | 'manual';
  eventType?: string;
  payloadSchema: Record<string, unknown>;
}

export const KNOWN_TRIGGERS: TriggerDefinition[] = [
  { id: 'cliente.creado', name: 'Client created', description: 'When a new client is created', category: 'domain', eventType: 'cliente.creado', payloadSchema: {} },
  { id: 'cita.confirmada', name: 'Appointment booked', description: 'When an appointment is confirmed', category: 'domain', eventType: 'cita.confirmada', payloadSchema: {} },
  { id: 'cita.cancelada', name: 'Appointment cancelled', description: 'When an appointment is cancelled', category: 'domain', eventType: 'cita.cancelada', payloadSchema: {} },
  { id: 'pago.recibido', name: 'Invoice paid', description: 'When an invoice payment is received', category: 'domain', eventType: 'pago.recibido', payloadSchema: {} },
  { id: 'tarea.overdue', name: 'Task overdue', description: 'When a task passes its due date', category: 'domain', eventType: 'tarea.overdue', payloadSchema: {} },
  { id: 'ejecucion.manual', name: 'Manual execution', description: 'Triggered manually by a user', category: 'manual', payloadSchema: {} },
  { id: 'cron.diario', name: 'Daily schedule', description: 'Executes on a daily schedule', category: 'schedule', payloadSchema: {} },
];

export function getTrigger(id: string): TriggerDefinition | undefined {
  return KNOWN_TRIGGERS.find((t) => t.id === id);
}

export function getTriggersByEvent(eventType: string): TriggerDefinition[] {
  return KNOWN_TRIGGERS.filter((t) => t.eventType === eventType);
}
