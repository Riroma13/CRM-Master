import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PreferenceService } from './preferences/preference.service';
import { NotificationGuard } from './guards/notification.guard';
import { PreferenceGuard } from './guards/preference.guard';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Post()
  @UseGuards(NotificationGuard)
  async create(
    @Body() body: { tenantId: string; definitionId: string; userId: string; content?: Record<string, unknown>; idempotencyKey?: string; correlationId?: string; scheduledAt?: string; expiresAt?: string },
  ) {
    const id = await this.notificationService.createNotification(body.tenantId, {
      definitionId: body.definitionId,
      userId: body.userId,
      content: body.content,
      idempotencyKey: body.idempotencyKey,
      correlationId: body.correlationId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return { id };
  }

  @Get()
  @UseGuards(NotificationGuard)
  async list(
    @Query('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationService.listNotifications(tenantId, {
      userId,
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @UseGuards(NotificationGuard)
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.notificationService.getNotification(tenantId, id);
  }

  @Post(':id/cancel')
  @UseGuards(NotificationGuard)
  async cancel(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.notificationService.cancelNotification(tenantId, id);
  }

  @Patch('preferences')
  @UseGuards(PreferenceGuard)
  async updatePreferences(
    @Body() body: { tenantId: string; userId: string; category?: string; enabled?: boolean; preferredChannels?: string[]; digestFrequency?: string; timezone?: string; language?: string; quietHoursStart?: string; quietHoursEnd?: string; quietHoursTz?: string },
  ) {
    const pref = await this.preferenceService.upsertPreference(body.tenantId, body.userId, body.category, {
      enabled: body.enabled,
      preferredChannels: body.preferredChannels as any,
      digestFrequency: body.digestFrequency as any,
      timezone: body.timezone,
      language: body.language,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
      quietHoursTz: body.quietHoursTz,
    });
    return pref;
  }
}
