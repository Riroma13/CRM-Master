import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common'; import { ApiTags } from '@nestjs/swagger'; import { TenantEventosAcademicosService } from './tenant-eventos-academicos.service'; import { TenantId } from '../../common/decorators/tenant-id.decorator';
@ApiTags('Eventos Académicos') @Controller('api/v1/tenant/eventos-academicos')
export class TenantEventosAcademicosController {
  constructor(private readonly service: TenantEventosAcademicosService) {}
  @Get() findAll(@TenantId() t: string, @Query('year') year?: string) { return this.service.findAll(t, year ? parseInt(year) : undefined); }
  @Post() create(@TenantId() t: string, @Body() b: any) { return this.service.create(t, b); }
  @Delete(':id') remove(@TenantId() t: string, @Param('id') id: string) { return this.service.remove(t, id); }
}
