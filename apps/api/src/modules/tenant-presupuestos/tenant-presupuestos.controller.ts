import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantPresupuestosService } from './tenant-presupuestos.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@ApiTags('Tenant - Presupuestos')
@Controller('api/v1/tenant/presupuestos')
export class TenantPresupuestosController {
  constructor(private readonly service: TenantPresupuestosService) {}

  @Get()
  @RequirePermission('clientes', 'read')
  findAll(@TenantId() tenantId: string, @Query('clienteId') clienteId?: string) {
    return this.service.findAll(tenantId, clienteId);
  }

  @Get(':id')
  @RequirePermission('clientes', 'read')
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermission('clientes', 'create')
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @RequirePermission('clientes', 'update')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @RequirePermission('clientes', 'delete')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
