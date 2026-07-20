import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyProvider {
  validate(key: string, expectedKey: string): boolean {
    if (!key || !expectedKey) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expectedKey));
    } catch {
      return false;
    }
  }
}
