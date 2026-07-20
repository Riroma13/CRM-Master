import { Injectable } from '@nestjs/common';
import type { ChannelOutputSanitizer } from '@shared/communication';

@Injectable()
export class WhatsappSanitizer implements ChannelOutputSanitizer {
  sanitize(_channel: string, content: string): string {
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/([~*_`])\1\1/g, '$1')  // prevent abuse of markdown
      .substring(0, 4096)
      .trim();
  }

  validate(_channel: string, content: string): boolean {
    return content.length > 0 && content.length <= 4096;
  }
}
