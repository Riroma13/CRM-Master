import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantClientesService } from './tenant-clientes.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Clientes')
@ApiBearerAuth()
@Controller('api/v1/tenant/clientes')
export class TenantClientesController {
  constructor(private readonly service: TenantClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query('search') search?: string,
    @Query('estado') estado?: string,
    @Query('salud') salud?: string,
  ) {
    return this.service.findAll(tenantId, { search, estado, salud });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un cliente' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un cliente' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cliente' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
