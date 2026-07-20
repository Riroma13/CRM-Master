import type { ActivityEventEnvelope } from './event-envelope';

export interface EnrichmentContext {
  eventId: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  tenantId: string;
}

export interface EnrichmentResult {
  subjectName?: string;
  actorName?: string;
}

export interface EventEnricher {
  readonly name: string;
  readonly description: string;
  enrich(context: EnrichmentContext): Promise<EnrichmentResult>;
}

/** @deprecated Use EventEnricher with EnrichmentContext instead */
export type PersistedActivityEvent = ActivityEventEnvelope & { id: number };
