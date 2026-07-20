import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ActivityTimelineService } from './activity-timeline.service';
import { TimelineQuery, TimelineQuerySchema, PaginatedResult, ActivityEventRow } from './dto';

@ApiTags('Activity Timeline')
@Controller('api/v1/timeline')
export class ActivityTimelineController {
  constructor(private readonly service: ActivityTimelineService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated activity timeline with filters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'actor', required: false })
  @ApiQuery({ name: 'sourceModule', required: false })
  @ApiQuery({ name: 'severity', required: false, enum: ['info', 'warning', 'error', 'critical'] })
  @ApiQuery({ name: 'category', required: false, enum: ['crm', 'scheduling', 'communication', 'automation', 'auth'] })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'correlationId', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  @ApiQuery({ name: 'visibility', required: false, enum: ['public', 'internal', 'private', 'tenant-only'] })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTimeline(
    @Query() query: Record<string, unknown>,
  ): Promise<PaginatedResult<ActivityEventRow>> {
    const parsed = TimelineQuerySchema.parse(query);
    return this.service.getTimeline(parsed);
  }
}
