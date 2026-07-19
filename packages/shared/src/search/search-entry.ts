// ─── SearchEngine interface ─────────────────────────────────────────
// SearchService depends ONLY on this interface.
// TsVectorSearchEngine implements it for v1.
// PgVectorSearchEngine will implement it for v2 (vector/hybrid search).

export interface SearchEngine {
  index(input: IndexSearchInput): Promise<void>;
  search(query: SearchQuery): Promise<SearchResultItem[]>;
  remove(entityType: string, entityId: string, tenantId: string): Promise<void>;
}

// ─── Input types ────────────────────────────────────────────────────

export interface IndexSearchInput {
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  tags?: string[];
  tenantId: string;
  clienteId?: string;
  payload?: Record<string, unknown>;
}

export interface SearchQuery {
  q: string;
  type?: string;
  tenantId: string;
  page?: number;
  limit?: number;
}

// ─── Result types ───────────────────────────────────────────────────

export interface SearchResultItem {
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  tags?: string[];
  matchField?: 'title' | 'description' | 'tags' | 'fuzzy';
  score: number;
  payload?: Record<string, unknown>;
  url: string;
  createdAt: string;
}

export interface SearchGroup {
  entityType: string;
  label: string;
  icon: string;
  results: SearchResultItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
  total: number;
  query: string;
}

// ─── Domain Events (published by domain modules) ─────────────────────
// SearchModule consumes these. Domain modules do NOT import SearchModule.

export interface DomainEntityEvent {
  eventType: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityId: string;
  tenantId: string;
  clienteId?: string;
  data: Record<string, unknown>;
  occurredAt: string;
}
