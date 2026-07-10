import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantWebhooksService } from './tenant-webhooks.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenant - Webhooks')
@Controller('api/v1/tenant/webhooks')
export class TenantWebhooksController {
  constructor(private readonly service: TenantWebhooksService) {}

  @Get()
  findAll(@TenantId() tenantId: string) { return this.service.findAll(tenantId); }

  @Post()
  create(@TenantId() tenantId: string, @Body() body: any) { return this.service.create(tenantId, body); }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.remove(tenantId, id); }
}
