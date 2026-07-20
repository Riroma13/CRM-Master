import type { ActivityEventEnvelope } from './event-envelope';

export interface EventEnricher {
  readonly name: string;
  enrich(event: ActivityEventEnvelope): Promise<ActivityEventEnvelope>;
}
