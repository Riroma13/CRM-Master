import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SearchEngine, SearchQuery, SearchResultItem, IndexSearchInput } from '@shared/search';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject('SEARCH_ENGINE') private readonly engine: SearchEngine,
  ) {}

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    try {
      return await this.engine.search(query);
    } catch (error) {
      this.logger.error(`Search failed: ${(error as Error).message}`);
      return [];
    }
  }

  async index(input: IndexSearchInput): Promise<void> {
    try {
      await this.engine.index(input);
    } catch (error) {
      this.logger.error(`Index failed for ${input.entityType}/${input.entityId}: ${(error as Error).message}`);
    }
  }

  async remove(entityType: string, entityId: string, tenantId: string): Promise<void> {
    try {
      await this.engine.remove(entityType, entityId, tenantId);
    } catch (error) {
      this.logger.error(`Remove failed for ${entityType}/${entityId}: ${(error as Error).message}`);
    }
  }
}
