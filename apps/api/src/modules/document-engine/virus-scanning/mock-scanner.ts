import { Injectable } from '@nestjs/common';
import type { VirusScanner, ScanResult } from '@shared/document';

@Injectable()
export class MockScanner implements VirusScanner {
  async scan(_file: Buffer, _fileName: string): Promise<ScanResult> {
    return { clean: true, scannedAt: new Date().toISOString() };
  }
}
