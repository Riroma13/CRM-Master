import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StripeGateway, STRIPE_CLIENT, type StripeClient } from './stripe-gateway';
import { STRIPE_WEBHOOK_SECRET } from './stripe-gateway';

const MAX_EVENT_AGE_MS = 5 * 60 * 1000;

@Injectable()
export class StripeWebhookGuard implements CanActivate {
  private readonly logger = new Logger(StripeWebhookGuard.name);

  constructor(
    private readonly stripeGateway: StripeGateway,
    @InjectQueue('billing:stripe-webhooks')
    private readonly webhookQueue: Queue,
    @Inject(STRIPE_WEBHOOK_SECRET)
    private readonly webhookSecret: string,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const rawBody = request.rawBody ?? request.body;
    const signature = request.headers['stripe-signature'];

    if (!rawBody) {
      this.logger.warn('Webhook rejected: missing raw body');
      throw new UnauthorizedException('Missing request body');
    }

    if (!signature) {
      this.logger.warn('Webhook rejected: missing stripe-signature header');
      throw new UnauthorizedException('Missing stripe-signature header');
    }

    let event: ReturnType<StripeClient['webhooks']['constructEvent']>;
    try {
      event = this.stripeGateway.verifyWebhookSignature(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.warn(`Webhook rejected: invalid signature — ${err.message}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - event.created > MAX_EVENT_AGE_MS / 1000) {
      this.logger.warn(
        `Webhook rejected: event too old — id=${event.id} created=${event.created}`,
      );
      throw new UnauthorizedException('Webhook event timestamp too old');
    }

    this.logger.log(`Webhook accepted: type=${event.type} id=${event.id}`);

    await this.webhookQueue.add(event.id, {
      eventId: event.id,
      type: event.type,
      data: event.data.object,
    });

    response.status(200).json({ received: true });
    return false;
  }
}
