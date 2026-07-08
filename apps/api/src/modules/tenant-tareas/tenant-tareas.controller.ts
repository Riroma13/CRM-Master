import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantTareasService } from './tenant-tareas.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Tareas')
@Controller('api/v1/tenant/tareas')
export class TenantTareasController {
  constructor(private readonly service: TenantTareasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tareas del tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de tarea' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear tarea' })
  create(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tarea (estado, prioridad, etc)' })
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() body: any) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tarea' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
