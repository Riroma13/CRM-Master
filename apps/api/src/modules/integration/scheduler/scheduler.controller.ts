import { Controller, Post, Delete, Get, Param, Body } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ScheduleSchema } from '../dto';

@Controller('api/v1/integration/schedule')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  async schedule(@Body() body: unknown) {
    const parsed = ScheduleSchema.parse(body);
    return this.schedulerService.schedule(parsed.connectorId, parsed.cronPattern, 'system');
  }

  @Delete(':id')
  async unschedule(@Param('id') id: string) {
    return this.schedulerService.unschedule(id);
  }

  @Get()
  async list() {
    return this.schedulerService.listSchedules('system');
  }
}
