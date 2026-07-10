import { Controller, Get, Post, Delete, Body } from '@nestjs/common'; import { ApiTags, ApiOperation } from '@nestjs/swagger'; import { GoogleCalendarService } from './google-calendar.service'; import { TenantId } from '../../common/decorators/tenant-id.decorator';
@ApiTags('Tenant - Google Calendar') @Controller('api/v1/tenant/calendar')
export class GoogleCalendarController {
  constructor(private readonly service: GoogleCalendarService) {}
  @Get('status') status(@TenantId() t: string) { return this.service.getStatus(t); }
  @Post('connect') connect(@TenantId() t: string, @Body() b: any) { return this.service.storeToken(t, b); }
  @Delete('disconnect') disconnect(@TenantId() t: string) { return this.service.disconnect(t); }
}
