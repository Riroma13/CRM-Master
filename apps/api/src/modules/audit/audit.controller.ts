import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener registros de auditoría' })
  findAll(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.findAll(limit ? parseInt(limit, 10) : 100, tenantId);
  }
}
