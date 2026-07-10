import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantPlantillasService } from './tenant-plantillas.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Plantillas')
@Controller('api/v1/tenant/plantillas')
export class TenantPlantillasController {
  constructor(private readonly service: TenantPlantillasService) {}
  @Get() findAll(@TenantId() t: string) { return this.service.findAll(t); }
  @Post() create(@TenantId() t: string, @Body() b: any) { return this.service.create(t, b); }
  @Patch(':id') update(@TenantId() t: string, @Param('id') id: string, @Body() b: any) { return this.service.update(t, id, b); }
  @Delete(':id') remove(@TenantId() t: string, @Param('id') id: string) { return this.service.remove(t, id); }
}
