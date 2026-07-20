import { Injectable } from '@nestjs/common';
import type { ChannelOutputSanitizer } from '@shared/communication';

@Injectable()
export class SmsSanitizer implements ChannelOutputSanitizer {
  sanitize(_channel: string, content: string): string {
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .substring(0, 1600)
      .trim();
  }

  validate(_channel: string, content: string): boolean {
    return content.length > 0 && content.length <= 1600;
  }
}
