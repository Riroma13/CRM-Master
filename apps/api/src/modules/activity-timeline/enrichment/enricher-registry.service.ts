import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentContext, EnrichmentResult } from '../../../../../../packages/shared/src/activity-timeline';
import { EntityNameEnricher } from './entity-name-enricher';
import { ActorNameEnricher } from './actor-name-enricher';

@Injectable()
export class EnricherRegistryService {
  private readonly logger = new Logger(EnricherRegistryService.name);

  constructor(
    private readonly entityNameEnricher: EntityNameEnricher,
    private readonly actorNameEnricher: ActorNameEnricher,
  ) {}

  async runEnrichers(context: EnrichmentContext): Promise<EnrichmentResult> {
    const result: EnrichmentResult = {};

    await this.safeEnrich(this.entityNameEnricher, context, result);
    await this.safeEnrich(this.actorNameEnricher, context, result);

    return result;
  }

  private async safeEnrich(
    enricher: { name: string; enrich(ctx: EnrichmentContext): Promise<EnrichmentResult> },
    context: EnrichmentContext,
    accumulator: EnrichmentResult,
  ): Promise<void> {
    try {
      const partial = await enricher.enrich(context);
      if (partial.subjectName !== undefined) accumulator.subjectName = partial.subjectName;
      if (partial.actorName !== undefined) accumulator.actorName = partial.actorName;
    } catch (error) {
      this.logger.error(
        `Enricher "${enricher.name}" failed for event ${context.eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
