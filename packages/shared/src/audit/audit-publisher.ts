import type { AuditEvent } from './audit.types';

export interface AuditPublisher {
  publish(event: Omit<AuditEvent, 'id'>): Promise<{ eventId: string }>;
}
