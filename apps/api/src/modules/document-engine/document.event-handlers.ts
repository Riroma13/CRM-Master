import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class DocumentEventHandlers {
  private readonly logger = new Logger(DocumentEventHandlers.name);

  @OnEvent('document.uploaded')
  async onDocumentUploaded(payload: Record<string, unknown>) {
    this.logger.log(`Document uploaded event: ${JSON.stringify(payload)}`);
  }

  @OnEvent('document.deleted')
  async onDocumentDeleted(payload: Record<string, unknown>) {
    this.logger.log(`Document deleted event: ${JSON.stringify(payload)}`);
  }

  @OnEvent('document.versioned')
  async onDocumentVersioned(payload: Record<string, unknown>) {
    this.logger.log(`Document versioned event: ${JSON.stringify(payload)}`);
  }
}
