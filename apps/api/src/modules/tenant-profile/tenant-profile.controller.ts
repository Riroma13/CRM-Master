import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantProfileService } from './tenant-profile.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Perfil')
@Controller('api/v1/tenant/profile')
export class TenantProfileController {
  constructor(private readonly service: TenantProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener perfil del tenant' })
  getProfile(@TenantId() tenantId: string) {
    return this.service.getProfile(tenantId);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar perfil del tenant' })
  updateProfile(@TenantId() tenantId: string, @Body() body: any) {
    return this.service.updateProfile(tenantId, body);
  }
}
