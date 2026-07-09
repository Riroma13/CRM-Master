import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantHealthService } from './tenant-health.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Salud')
@ApiBearerAuth()
@Controller('api/v1/tenant/health')
export class TenantHealthController {
  constructor(private readonly service: TenantHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener salud automática del tenant' })
  getHealth(@TenantId() tenantId: string) {
    return this.service.getHealth(tenantId);
  }
}
