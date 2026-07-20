import { describe, it, expect } from 'vitest';
import type { EventEnricher } from '../event-enricher';
import type { ActivityEventEnvelope } from '../event-envelope';

describe('EventEnricher interface', () => {
  it('contract: a valid enricher can be created', () => {
    const enricher: EventEnricher = {
      name: 'test-enricher',
      async enrich(event: ActivityEventEnvelope): Promise<ActivityEventEnvelope> {
        return {
          ...event,
          subjectName: 'Enriched Name',
        };
      },
    };

    expect(enricher.name).toBe('test-enricher');
    expect(typeof enricher.enrich).toBe('function');
  });

  it('contract: enrich returns the enriched event', async () => {
    const enricher: EventEnricher = {
      name: 'entity-name',
      async enrich(event: ActivityEventEnvelope): Promise<ActivityEventEnvelope> {
        return {
          ...event,
          subjectName: 'Resolved Entity Name',
        };
      },
    };

    const input: ActivityEventEnvelope = {
      eventType: 'cliente.creado',
      tenantId: 't-1',
      entityType: 'cliente',
      actor: 'admin',
      sourceModule: 'clientes',
      severity: 'info',
      category: 'crm',
      payload: {},
    };

    const result = await enricher.enrich(input);
    expect(result.subjectName).toBe('Resolved Entity Name');
    expect(result.eventType).toBe('cliente.creado');
  });

  it('contract: name is readonly', () => {
    const enricher: EventEnricher = {
      name: 'fixed-name',
      async enrich(event: ActivityEventEnvelope): Promise<ActivityEventEnvelope> {
        return event;
      },
    };

    expect(enricher.name).toBe('fixed-name');
  });

  it('contract: enricher can leave event unchanged', async () => {
    const enricher: EventEnricher = {
      name: 'noop',
      async enrich(event: ActivityEventEnvelope): Promise<ActivityEventEnvelope> {
        return event;
      },
    };

    const input: ActivityEventEnvelope = {
      eventType: 'login.realizado',
      tenantId: 't-1',
      entityType: 'auth',
      actor: 'user',
      sourceModule: 'auth',
      severity: 'info',
      category: 'auth',
      payload: {},
    };

    const result = await enricher.enrich(input);
    expect(result).toEqual(input);
  });
});
