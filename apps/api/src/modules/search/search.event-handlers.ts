import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchService } from './search.service';
import type { DomainEntityEvent } from '@shared/search';

/**
 * Search Event Handlers.
 *
 * Consume domain events and delegate to SearchService.
 * SearchModule is the sole owner of the index.
 * Domain modules do NOT import SearchModule or SearchEngine.
 */
@Injectable()
export class SearchEventHandlers {
  private readonly logger = new Logger(SearchEventHandlers.name);

  constructor(private readonly searchService: SearchService) {}

  @OnEvent('entity.created')
  async handleEntityCreated(event: DomainEntityEvent) {
    await this.searchService.index({
      entityType: event.entityType,
      entityId: event.entityId,
      title: (event.data?.title as string) ?? event.entityId,
      description: event.data?.description as string | undefined,
      tags: event.data?.tags as string[] | undefined,
      tenantId: event.tenantId,
      clienteId: event.clienteId,
      payload: event.data,
    });
  }

  @OnEvent('entity.updated')
  async handleEntityUpdated(event: DomainEntityEvent) {
    // Re-index: same as create, UPSERT handles duplicates
    await this.searchService.index({
      entityType: event.entityType,
      entityId: event.entityId,
      title: (event.data?.title as string) ?? event.entityId,
      description: event.data?.description as string | undefined,
      tags: event.data?.tags as string[] | undefined,
      tenantId: event.tenantId,
      clienteId: event.clienteId,
      payload: event.data,
    });
  }

  @OnEvent('entity.deleted')
  async handleEntityDeleted(event: DomainEntityEvent) {
    await this.searchService.remove(event.entityType, event.entityId, event.tenantId);
  }
}
