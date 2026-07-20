import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

const PREVIEW_ROOT = process.env.DOCUMENT_PREVIEW_PATH || '/tmp/crm-previews';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class PreviewStorage {
  private readonly logger = new Logger(PreviewStorage.name);

  async store(tenantId: string, documentId: string, versionId: string, data: Buffer): Promise<string> {
    const dir = path.join(PREVIEW_ROOT, tenantId, documentId);
    await fs.mkdir(dir, { recursive: true });
    const storageKey = path.join(dir, `${versionId}.preview`);
    await fs.writeFile(storageKey, data);
    return storageKey;
  }

  async retrieve(storageKey: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(storageKey);
    } catch {
      return null;
    }
  }

  async deleteExpired(): Promise<number> {
    let count = 0;
    try {
      const dirs = await fs.readdir(PREVIEW_ROOT);
      for (const tenantDir of dirs) {
        const tenantPath = path.join(PREVIEW_ROOT, tenantDir);
        const docDirs = await fs.readdir(tenantPath);
        for (const docDir of docDirs) {
          const docPath = path.join(tenantPath, docDir);
          const files = await fs.readdir(docPath);
          for (const file of files) {
            const filePath = path.join(docPath, file);
            const stat = await fs.stat(filePath);
            if (Date.now() - stat.mtimeMs > DEFAULT_TTL_MS) {
              await fs.unlink(filePath);
              count++;
            }
          }
        }
      }
    } catch { /* directory may not exist */ }
    return count;
  }
}
