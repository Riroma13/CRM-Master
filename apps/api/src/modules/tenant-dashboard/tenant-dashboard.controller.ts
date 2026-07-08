import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';

@ApiTags('Tenant - Dashboard')
@ApiBearerAuth()
@Controller('api/v1/tenant/dashboard')
export class TenantDashboardController {
  constructor(private readonly service: TenantDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas del dashboard del tenant' })
  async getDashboard(@TenantId() tenantId: string) {
    return this.service.getDashboard(tenantId);
  }
}
