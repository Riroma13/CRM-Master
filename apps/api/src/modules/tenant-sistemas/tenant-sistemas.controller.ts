import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantSistemasService } from './tenant-sistemas.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Sistemas')
@Controller('api/v1/tenant/sistemas')
export class TenantSistemasController {
  constructor(private readonly service: TenantSistemasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sistemas del tenant' })
  findAll(@TenantId() tenantId: string, @Query('clienteId') clienteId?: string) {
    return this.service.findAll(tenantId, clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de sistema' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear sistema' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar sistema' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar sistema' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Listar items de inventario de un sistema' })
  getItems(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getItems(tenantId, id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Crear item de inventario' })
  createItem(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.createItem(tenantId, id, body);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar item de inventario' })
  updateItem(@TenantId() tenantId: string, @Param('itemId') itemId: string, @Body() body: any) {
    return this.service.updateItem(tenantId, itemId, body);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar item de inventario' })
  removeItem(@TenantId() tenantId: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(tenantId, itemId);
  }
}
