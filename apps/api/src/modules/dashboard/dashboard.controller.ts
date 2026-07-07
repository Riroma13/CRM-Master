import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(TenantScopeGuard)
@Controller('api/v1/admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas agregadas del sistema (Mission Control)' })
  async getDashboard() {
    return this.dashboardService.getMetrics();
  }
}
