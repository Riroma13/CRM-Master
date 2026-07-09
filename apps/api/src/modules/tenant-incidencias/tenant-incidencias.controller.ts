import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantIncidenciasService } from './tenant-incidencias.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Incidencias')
@ApiBearerAuth()
@Controller('api/v1/tenant/incidencias')
export class TenantIncidenciasController {
  constructor(private readonly service: TenantIncidenciasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar incidencias del tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.service.findAll(tenantId, { estado, prioridad, clienteId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de incidencia' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear incidencia' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar incidencia' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cerrar incidencia' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
