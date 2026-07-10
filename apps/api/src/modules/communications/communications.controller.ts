import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@ApiTags('Comunicaciones')
@ApiBearerAuth()
@Controller('api/v1/communications')
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  @Get(':clienteId')
  @RequirePermission('clientes', 'read')
  @ApiOperation({ summary: 'Obtener comunicaciones de un cliente' })
  findByCliente(@TenantId() tenantId: string, @Param('clienteId') clienteId: string) {
    return this.service.findByCliente(tenantId, clienteId);
  }

  @Post(':clienteId')
  @RequirePermission('clientes', 'update')
  @ApiOperation({ summary: 'Registrar comunicación con un cliente' })
  create(
    @TenantId() tenantId: string,
    @Param('clienteId') clienteId: string,
    @Body() body: { tipo: string; titulo: string; descripcion?: string },
  ) {
    return this.service.log({
      tenantId,
      clienteId,
      tipo: body.tipo as any,
      titulo: body.titulo,
      descripcion: body.descripcion,
    });
  }
}
