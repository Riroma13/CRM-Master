import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantNotificacionesService } from './tenant-notificaciones.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Notificaciones')
@Controller('api/v1/tenant/notificaciones')
export class TenantNotificacionesController {
  constructor(private readonly service: TenantNotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener notificaciones recientes del tenant' })
  getNotificaciones(@TenantId() tenantId: string) {
    return this.service.getNotificaciones(tenantId);
  }
}
