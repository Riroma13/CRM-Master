import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WebhookSubscriptionService } from './webhook-subscription.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

interface CreateSubscriptionBody {
  url: string;
  eventTypes: string[];
  secret?: string;
}

@Controller('api/v1/internal/webhooks')
export class WebhookController {
  constructor(
    private readonly subscriptionService: WebhookSubscriptionService,
    private readonly dispatcherService: WebhookDispatcherService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateSubscriptionBody,
  ): Promise<{ data: unknown }> {
    if (!body.url || !body.eventTypes || body.eventTypes.length === 0) {
      throw new BadRequestException('url and eventTypes are required');
    }

    const subscription = await this.subscriptionService.createSubscription({
      tenantId: 'system',
      url: body.url,
      eventTypes: body.eventTypes,
      secret: body.secret,
    });

    return { data: subscription };
  }

  @Get()
  async list(): Promise<{ data: unknown[] }> {
    const subscriptions = await this.subscriptionService.listSubscriptions('system');
    return { data: subscriptions };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    try {
      await this.subscriptionService.deleteSubscription(id);
    } catch {
      throw new NotFoundException('Subscription not found');
    }
    return { deleted: true };
  }

  @Post(':id/replay')
  @HttpCode(HttpStatus.OK)
  async replay(@Param('id') id: string): Promise<{ replayed: boolean }> {
    try {
      await this.dispatcherService.replay(id);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw new NotFoundException(err.message);
      }
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Replay failed',
      );
    }
    return { replayed: true };
  }
}
