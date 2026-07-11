import { Controller, Get, Post, Body } from '@nestjs/common'; import { ApiTags } from '@nestjs/swagger'; import { TenantEncuestasService } from './tenant-encuestas.service'; import { TenantId } from '../../common/decorators/tenant-id.decorator';
@ApiTags('Encuestas') @Controller('api/v1/tenant/encuestas')
export class TenantEncuestasController {
  constructor(private readonly service: TenantEncuestasService) {}
  @Get() findAll(@TenantId() t: string) { return this.service.findAll(t); }
  @Get('promedio') promedio(@TenantId() t: string) { return this.service.promedio(t); }
  @Post() create(@TenantId() t: string, @Body() b: any) { return this.service.create(t, b); }
}
