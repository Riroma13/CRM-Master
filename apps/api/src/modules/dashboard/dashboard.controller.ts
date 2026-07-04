import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { TenantScopeGuard } from '../../common/guards/tenant-scope.guard';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, TenantScopeGuard)
@Controller('api/v1/admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Métricas agregadas del sistema (Mission Control)' })
  async getDashboard() {
    return this.dashboardService.getMetrics();
  }
}
