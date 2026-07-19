import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { SearchEngine, IndexSearchInput, SearchQuery, SearchResultItem } from '@shared/search';
import { Prisma } from '@prisma/client';

/**
 * TsVectorSearchEngine — implementación de SearchEngine basada en
 * PostgreSQL tsvector + tsquery con índices GIN.
 *
 * SearchService depende de SearchEngine, no de esta implementación.
 * Migrar a pgvector requiere solo una nueva implementación de SearchEngine.
 */
@Injectable()
export class TsVectorSearchEngine implements SearchEngine {
  private readonly logger = new Logger(TsVectorSearchEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async index(input: IndexSearchInput): Promise<void> {
    try {
      const searchVector = this.buildTsVector(input.title, input.description, input.tags);

      await this.prisma.admin.$executeRawUnsafe(
        `INSERT INTO search_entries (id, tenant_id, cliente_id, entity_type, entity_id, title, description, tags, search_vector, payload, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, to_tsvector('simple', $8), $9::jsonb, NOW(), NOW())
         ON CONFLICT (entity_type, entity_id, tenant_id)
         DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           tags = EXCLUDED.tags,
           search_vector = EXCLUDED.search_vector,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
        input.tenantId,
        input.clienteId ?? null,
        input.entityType,
        input.entityId,
        input.title,
        input.description ?? '',
        input.tags ?? [],
        searchVector,
        JSON.stringify(input.payload ?? {}),
      );
    } catch (error) {
      this.logger.error(`Failed to index ${input.entityType}/${input.entityId}: ${(error as Error).message}`);
    }
  }

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 50);
    const offset = (page - 1) * limit;

    const searchTerms = this.sanitizeQuery(query.q);
    if (!searchTerms) return [];

    const typeFilter = query.type
      ? `AND entity_type = $2`
      : '';
    const params: unknown[] = [query.tenantId];
    if (query.type) params.push(query.type);
    params.push(searchTerms);
    params.push(limit);
    params.push(offset);

    const searchSql = `
      SELECT
        id, tenant_id, cliente_id, entity_type, entity_id,
        title, description, tags, payload, created_at,
        ts_rank(search_vector, to_tsquery('simple', $3)) as score,
        CASE
          WHEN search_vector @@ to_tsquery('simple', $3) THEN 'title'
          WHEN similarity(title, $3) > 0.3 THEN 'fuzzy'
          ELSE 'description'
        END as match_field
      FROM search_entries
      WHERE tenant_id = $1
        ${typeFilter}
        AND (
          search_vector @@ to_tsquery('simple', $3)
          OR similarity(title, $3) > 0.3
        )
      ORDER BY score DESC, created_at DESC
      LIMIT $4 OFFSET $5
    `;

    try {
      const rows: any[] = await this.prisma.admin.$queryRawUnsafe(searchSql, ...params) as any[];

      return rows.map((row: any) => ({
        entityType: row.entity_type,
        entityId: row.entity_id,
        title: row.title,
        description: row.description || undefined,
        tags: row.tags || [],
        matchField: row.match_field as SearchResultItem['matchField'],
        score: row.score || 0,
        payload: row.payload || undefined,
        url: this.buildUrl(row.entity_type, row.entity_id),
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
      }));
    } catch (error) {
      this.logger.error(`Search query failed: ${(error as Error).message}`);
      return [];
    }
  }

  async remove(entityType: string, entityId: string, tenantId: string): Promise<void> {
    try {
      await this.prisma.admin.$executeRawUnsafe(
        `DELETE FROM search_entries WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3`,
        entityType,
        entityId,
        tenantId,
      );
    } catch (error) {
      this.logger.error(`Failed to remove ${entityType}/${entityId}: ${(error as Error).message}`);
    }
  }

  /** Construye el vector de búsqueda combinando título, descripción y tags */
  private buildTsVector(title: string, description?: string, tags?: string[]): string {
    const parts = [title];
    if (description) parts.push(description);
    if (tags?.length) parts.push(tags.join(' '));
    return parts.join(' ').replace(/[^\w\s]/g, ' ').trim();
  }

  /** Sanitiza la query para tsquery: elimina caracteres especiales, añade :* para prefix matching */
  private sanitizeQuery(q: string): string {
    const cleaned = q.replace(/[^\w\s]/g, ' ').trim();
    if (!cleaned) return '';
    // prefix matching: cada término se convierte en termino:*
    return cleaned
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `${term}:*`)
      .join(' & ');
  }

  /** Construye la URL de navegación según el tipo de entidad */
  private buildUrl(entityType: string, entityId: string): string {
    const routeMap: Record<string, string> = {
      cliente: `/admin/clientes/${entityId}`,
      sistema: `/admin/sistemas/${entityId}`,
      documento: `/admin/documentos/${entityId}`,
      incidencia: `/admin/incidencias/${entityId}`,
      tarea: `/admin/tareas/${entityId}`,
      presupuesto: `/admin/presupuestos/${entityId}`,
      pago: `/admin/pagos/${entityId}`,
      actividad: `/admin/timeline?entityId=${entityId}`,
      usuario: `/admin/usuarios/${entityId}`,
    };
    return routeMap[entityType] || `/admin/search?entityType=${entityType}&entityId=${entityId}`;
  }
}
