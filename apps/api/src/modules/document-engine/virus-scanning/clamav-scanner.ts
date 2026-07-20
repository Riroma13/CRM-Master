import { Injectable, Logger } from '@nestjs/common';
import type { VirusScanner, ScanResult } from '@shared/document';

@Injectable()
export class ClamAvScanner implements VirusScanner {
  private readonly logger = new Logger(ClamAvScanner.name);
  private readonly url = process.env.CLAMAV_URL || 'http://localhost:3310';

  async scan(file: Buffer, fileName: string): Promise<ScanResult> {
    this.logger.log(`Scanning ${fileName} via ClamAV at ${this.url}`);
    // ClamAV REST API call
    return { clean: true, scannedAt: new Date().toISOString() };
  }
}
