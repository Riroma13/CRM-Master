import type { SendMessageInput } from './provider.interface';

export interface DeliveryQueue {
  enqueue(message: SendMessageInput): Promise<void>;
}
