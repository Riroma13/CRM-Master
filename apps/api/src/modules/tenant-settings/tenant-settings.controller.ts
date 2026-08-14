import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantSettingsDto } from './tenant-settings.dto';
import { TenantSettingsService } from './tenant-settings.service';

@ApiTags('Tenant - Configuración')
@ApiBearerAuth()
@Controller('api/v1/tenant/settings')
export class TenantSettingsController {
  constructor(private readonly service: TenantSettingsService) {}

  @Get()
  @RequirePermission('configuracion', 'read')
  @ApiOperation({ summary: 'Obtener configuración de identidad del tenant' })
  getSettings(@TenantId() tenantId: string) {
    return this.service.getSettings(tenantId);
  }

  @Patch()
  @RequirePermission('configuracion', 'update')
  @ApiOperation({ summary: 'Actualizar configuración de identidad del tenant' })
  updateSettings(@TenantId() tenantId: string, @Body() body: TenantSettingsDto) {
    return this.service.updateSettings(tenantId, body);
  }
}
