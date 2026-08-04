import { describe, it, expect } from 'vitest';
import type { EnrichmentContext, EnrichmentResult, EventEnricher } from '../event-enricher';

describe('EventEnricher interface', () => {
  it('contract: a valid enricher can be created', () => {
    const enricher: EventEnricher = {
      name: 'test-enricher',
      description: 'Test enricher',
      async enrich(_context: EnrichmentContext): Promise<EnrichmentResult> {
        return {
          subjectName: 'Enriched Name',
        };
      },
    };

    expect(enricher.name).toBe('test-enricher');
    expect(enricher.description).toBe('Test enricher');
    expect(typeof enricher.enrich).toBe('function');
  });

  it('contract: enrich returns the enriched event', async () => {
    const enricher: EventEnricher = {
      name: 'entity-name',
      description: 'Resolves an entity name',
      async enrich(_context: EnrichmentContext): Promise<EnrichmentResult> {
        return {
          subjectName: 'Resolved Entity Name',
        };
      },
    };

    const input: EnrichmentContext = {
      eventId: 'event-1',
      entityType: 'cliente',
      entityId: 'cliente-1',
      actor: 'admin',
      tenantId: 't-1',
    };

    const result = await enricher.enrich(input);
    expect(result).toEqual({ subjectName: 'Resolved Entity Name' });
  });

  it('contract: name is readonly', () => {
    const enricher: EventEnricher = {
      name: 'fixed-name',
      description: 'Fixed test enricher',
      async enrich(_context: EnrichmentContext): Promise<EnrichmentResult> {
        return {};
      },
    };

    expect(enricher.name).toBe('fixed-name');
  });

  it('contract: enricher can leave event unchanged', async () => {
    const enricher: EventEnricher = {
      name: 'noop',
      description: 'Does not add enrichment',
      async enrich(_context: EnrichmentContext): Promise<EnrichmentResult> {
        return {};
      },
    };

    const input: EnrichmentContext = {
      eventId: 'event-2',
      entityType: 'auth',
      entityId: null,
      actor: 'user',
      tenantId: 't-1',
    };

    const result = await enricher.enrich(input);
    expect(result).toEqual({});
  });
});
