import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantRecursosService } from './tenant-recursos.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Recursos')
@ApiBearerAuth()
@Controller('api/v1/tenant/recursos')
export class TenantRecursosController {
  constructor(private readonly service: TenantRecursosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar recursos del tenant' })
  findAll(@TenantId() tenantId: string, @Query('tipo') tipo?: string) {
    return this.service.findAll(tenantId, tipo);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un recurso' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un recurso' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un recurso' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un recurso (baja lógica)' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
