import { Injectable } from '@nestjs/common';
import type { ChannelOutputSanitizer } from '@shared/communication';

@Injectable()
export class EmailSanitizer implements ChannelOutputSanitizer {
  sanitize(_channel: string, content: string): string {
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
      .replace(/<[\/]?(html|head|body|meta|link|style|form|input|button|iframe)[^>]*>/gi, '')
      .trim();
  }

  validate(_channel: string, content: string): boolean {
    // Reject if contains un-sanitized dangerous patterns
    const dangerous = [
      /<script/i,
      /\bon\w+\s*=/i,
      /href\s*=\s*["']javascript:/i,
    ];
    return !dangerous.some((p) => p.test(content));
  }
}
