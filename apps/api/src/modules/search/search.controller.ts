import { Controller, Get, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQuerySchema, SearchQueryDto } from './dto';
import type { SearchResultItem } from '@shared/search';

@ApiTags('Search')
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Universal search across all CRM entities' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'tenantId', required: true, description: 'Tenant ID (from auth context)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(@Query() query: Record<string, unknown>) {
    let parsed: SearchQueryDto;
    try {
      parsed = SearchQuerySchema.parse(query);
    } catch (err: any) {
      throw new BadRequestException(err.errors ?? 'Invalid search query');
    }

    const results = await this.searchService.search({
      q: parsed.q,
      type: parsed.type,
      tenantId: parsed.tenantId,
      page: parsed.page,
      limit: parsed.limit,
    });

    const groups = this.groupResults(results, parsed.q);

    return {
      groups,
      total: results.length,
      query: parsed.q,
    };
  }

  private groupResults(results: SearchResultItem[], query: string) {
    const groupMap = new Map<string, SearchResultItem[]>();

    for (const item of results) {
      const key = item.entityType;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    const entityLabels: Record<string, { label: string; icon: string }> = {
      cliente: { label: 'Clientes', icon: 'Users' },
      sistema: { label: 'Sistemas', icon: 'HardDrive' },
      documento: { label: 'Documentos', icon: 'FileText' },
      incidencia: { label: 'Incidencias', icon: 'AlertTriangle' },
      tarea: { label: 'Tareas', icon: 'ClipboardList' },
      presupuesto: { label: 'Presupuestos', icon: 'Wallet' },
      pago: { label: 'Pagos', icon: 'CreditCard' },
      actividad: { label: 'Actividad', icon: 'Activity' },
      usuario: { label: 'Usuarios', icon: 'User' },
    };

    return Array.from(groupMap.entries()).map(([entityType, items]) => ({
      entityType,
      label: entityLabels[entityType]?.label ?? entityType,
      icon: entityLabels[entityType]?.icon ?? 'FileSearch',
      results: items,
    }));
  }
}
