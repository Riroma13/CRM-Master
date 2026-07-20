import { Injectable, Logger } from '@nestjs/common';
import type { DocumentStorage, StorageOperation } from '@shared/document';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH || '/tmp/crm-documents';

@Injectable()
export class LocalStorageProvider implements DocumentStorage {
  private readonly logger = new Logger(LocalStorageProvider.name);

  async store(tenantId: string, documentId: string, versionId: string, file: Buffer, _mimeType: string): Promise<string> {
    const dir = path.join(STORAGE_ROOT, tenantId, documentId);
    await fs.mkdir(dir, { recursive: true });
    const storageKey = path.join(dir, versionId);
    await fs.writeFile(storageKey, file);
    this.logger.log(`Stored document at ${storageKey}`);
    return storageKey;
  }

  async retrieve(storageKey: string): Promise<Buffer> {
    return fs.readFile(storageKey);
  }

  async delete(storageKey: string): Promise<void> {
    await fs.unlink(storageKey);
  }

  async getSignedUrl(storageKey: string, operation: StorageOperation, expiresIn = 3600): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    return `/api/v1/documents/proxy/${encodeURIComponent(storageKey)}?token=${token}&exp=${exp}&op=${operation}`;
  }
}
