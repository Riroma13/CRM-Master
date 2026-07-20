import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommunicationService } from './communication.service';

@Injectable()
export class CommunicationEventHandlers {
  private readonly logger = new Logger(CommunicationEventHandlers.name);

  constructor(private readonly communicationService: CommunicationService) {}

  @OnEvent('communication.send')
  async onSend(payload: Record<string, unknown>) {
    this.logger.log(`Event-driven communication triggered: ${JSON.stringify(payload)}`);
  }
}
