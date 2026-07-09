import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Búsqueda global en el tenant' })
  search(@TenantId() tenantId: string, @Query('q') q: string) {
    return this.service.search(tenantId, q);
  }
}
