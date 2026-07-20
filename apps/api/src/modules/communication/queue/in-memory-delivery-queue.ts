import { Injectable, Logger } from '@nestjs/common';
import type { DeliveryQueue, SendMessageInput } from "@shared/communication";

@Injectable()
export class InMemoryDeliveryQueue implements DeliveryQueue {
  private readonly logger = new Logger(InMemoryDeliveryQueue.name);

  async enqueue(message: SendMessageInput): Promise<void> {
    this.logger.log(`Enqueued message ${message.messageId} for channel ${message.channel}`);
    // The pipeline is invoked synchronously from the queue
    // Future: BullMQDeliveryQueue will defer to a worker
  }
}
