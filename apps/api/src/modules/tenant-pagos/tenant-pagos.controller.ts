import { Controller, Get, Post, Param } from '@nestjs/common'; import { ApiTags, ApiOperation } from '@nestjs/swagger'; import { TenantPagosService } from './tenant-pagos.service'; import { TenantId } from '../../common/decorators/tenant-id.decorator';
@ApiTags('Tenant - Pagos') @Controller('api/v1/tenant/pagos')
export class TenantPagosController {
  constructor(private readonly service: TenantPagosService) {}
  @Get() findAll(@TenantId() t: string) { return this.service.findAll(t); }
  @Post(':presupuestoId/:monto') create(@TenantId() t: string, @Param('presupuestoId') p: string, @Param('monto') m: string) { return this.service.create(t, { presupuestoId: p, monto: parseFloat(m) }); }
  @Post(':id/completar') complete(@Param('id') id: string, @TenantId() t: string) { return this.service.complete(id, t); }
}
