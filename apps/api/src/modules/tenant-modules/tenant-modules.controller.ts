import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantModulesService } from './tenant-modules.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Módulos')
@ApiBearerAuth()
@Controller('api/v1/tenant/modules')
export class TenantModulesController {
  constructor(private readonly service: TenantModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener módulos disponibles y activos del tenant' })
  getModules(@TenantId() tenantId: string) {
    return this.service.getModules(tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar módulos activos del tenant' })
  updateModules(@TenantId() tenantId: string, @Body() body: { enabled: string[] }) {
    return this.service.updateModules(tenantId, body.enabled);
  }
}
