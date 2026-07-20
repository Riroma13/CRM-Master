import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { DeadLetterQueueService } from './dlq.service';
import { WebhookHandler } from './webhook-handler';
import { SendMessageSchema, CreateTemplateSchema, UpdateTemplateSchema, TemplateListQuery, DeliveryQuery } from './dto';
import { PrismaService } from '../../common/prisma.service';

@Controller('api/v1/communications')
export class CommunicationController {
  constructor(
    private readonly communicationService: CommunicationService,
    private readonly dlqService: DeadLetterQueueService,
    private readonly webhookHandler: WebhookHandler,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Send ──────────────────────────────────────────────

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  async send(@Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = SendMessageSchema.parse(body);
    const result = await this.communicationService.send({
      ...parsed,
      tenantId,
      to: parsed.to,
    });
    return result;
  }

  // ─── Templates CRUD ────────────────────────────────────

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = CreateTemplateSchema.parse(body);
    const template = await this.prisma.admin.messageTemplate.create({
      data: { ...parsed, tenantId },
    });
    return template;
  }

  @Get('templates')
  async listTemplates(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = TemplateListQuery.parse(query);
    const where: any = { tenantId };
    if (parsed.channel) where.channel = parsed.channel;

    const [data, total] = await Promise.all([
      this.prisma.admin.messageTemplate.findMany({
        where, skip: (parsed.page - 1) * parsed.limit, take: parsed.limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.messageTemplate.count({ where }),
    ]);
    return { data, pagination: { page: parsed.page, limit: parsed.limit, total } };
  }

  @Get('templates/:id')
  async getTemplate(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    return this.prisma.admin.messageTemplate.findFirst({ where: { id, tenantId } });
  }

  @Patch('templates/:id')
  async updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string, @Body() body: unknown) {
    const parsed = UpdateTemplateSchema.parse(body);
    await this.prisma.admin.messageTemplate.updateMany({ where: { id, tenantId }, data: parsed });
    return { updated: true };
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    await this.prisma.admin.messageTemplate.deleteMany({ where: { id, tenantId } });
  }

  // ─── Delivery history ──────────────────────────────────

  @Get('deliveries')
  async listDeliveries(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = DeliveryQuery.parse(query);
    const where: any = { tenantId, dlq: false };
    if (parsed.status) where.status = parsed.status;
    if (parsed.channel) where.channel = parsed.channel;

    const [data, total] = await Promise.all([
      this.prisma.admin.messageDelivery.findMany({
        where, skip: (parsed.page - 1) * parsed.limit, take: parsed.limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.messageDelivery.count({ where }),
    ]);
    return { data, pagination: { page: parsed.page, limit: parsed.limit, total } };
  }

  // ─── DLQ ────────────────────────────────────────────────

  @Get('dlq')
  async listDlq(@Query('tenantId') tenantId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.dlqService.listDlq(tenantId, +page, +limit);
  }

  @Post('dlq/:id/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  async replayDlq(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    await this.dlqService.replay(id, tenantId);
    return { replayed: true };
  }

  // ─── Webhook receiver ──────────────────────────────────

  @Post('webhook/:providerId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(@Param('providerId') providerId: string, @Body() body: unknown, @Query('tenantId') tenantId: string) {
    const request = { headers: { 'content-type': 'application/json' }, body, rawBody: JSON.stringify(body) };
    await this.webhookHandler.handle(providerId, request);
    return { received: true };
  }
}
