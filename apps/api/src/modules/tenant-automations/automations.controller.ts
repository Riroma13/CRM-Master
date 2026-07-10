import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common'; import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AutomationsService } from './automations.service'; import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Automatizaciones') @Controller('api/v1/tenant/automations')
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}
  @Get('rules') getRules(@TenantId() t: string) { return this.service.getRules(t); }
  @Post('rules') createRule(@TenantId() t: string, @Body() b: any) { return this.service.createRule(t, b); }
  @Post('rules/:id/toggle') toggle(@Param('id') id: number, @TenantId() t: string) { return this.service.toggleRule(id, t); }
  @Delete('rules/:id') deleteRule(@Param('id') id: number, @TenantId() t: string) { this.service.deleteRule(id, t); return { success: true }; }
  @Get('logs') getLogs(@TenantId() t: string) { return this.service.getLogs(t); }
}
