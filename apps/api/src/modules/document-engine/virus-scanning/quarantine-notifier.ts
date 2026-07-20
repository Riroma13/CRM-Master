import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class QuarantineNotifier {
  private readonly logger = new Logger(QuarantineNotifier.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async notify(documentId: string, tenantId: string, fileName: string): Promise<void> {
    this.eventEmitter.emit('document.quarantined', {
      eventType: 'quarantined',
      documentId,
      tenantId,
      name: fileName,
      occurredAt: new Date().toISOString(),
    });
    this.logger.warn(`Quarantine event published for ${documentId} (tenant ${tenantId})`);
  }
}
