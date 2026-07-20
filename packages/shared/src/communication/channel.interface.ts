import type { SendMessageInput, SendResult } from './provider.interface';

export interface CommunicationChannel {
  readonly id: string;
  readonly name: string;
  readonly providerId: string;
  send?(message: SendMessageInput): Promise<SendResult>;
}
