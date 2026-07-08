import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { ReadStream } from 'fs';

export interface SavedFile {
  storageKey: string;
  filename: string;
}

export interface StorageFile {
  stream: ReadStream;
  filename: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath =
      this.configService.get<string>('STORAGE_PATH') || './storage';
  }

  /**
   * Writes a file to the local filesystem.
   * Path: {basePath}/tenants/{slug}/documentos/{uuid}/{filename}
   */
  async save(tenantSlug: string, file: { buffer: Buffer; originalname: string }): Promise<SavedFile> {
    const dirUuid = randomUUID();
    const relativeDir = `tenants/${tenantSlug}/documentos/${dirUuid}`;
    const dirPath = join(this.basePath, relativeDir);

    await fs.mkdir(dirPath, { recursive: true });

    const filePath = join(dirPath, file.originalname);
    await fs.writeFile(filePath, file.buffer);

    const storageKey = `${relativeDir}/${file.originalname}`;

    this.logger.log(`File saved: ${storageKey} (${file.buffer.length} bytes)`);

    return {
      storageKey,
      filename: file.originalname,
    };
  }

  /**
   * Returns a readable stream for the given storageKey.
   */
  async get(storageKey: string): Promise<StorageFile> {
    const filePath = join(this.basePath, storageKey);

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException(`File not found: ${storageKey}`);
    }

    const filename = storageKey.split('/').pop() || 'file';
    const stream = createReadStream(filePath);

    return { stream, filename };
  }

  /**
   * Deletes a file from the filesystem by its storageKey.
   * Also attempts to remove the parent directory if empty.
   */
  async delete(storageKey: string): Promise<void> {
    const filePath = join(this.basePath, storageKey);

    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted: ${storageKey}`);

      // Attempt to clean up parent directory if empty
      const dirPath = join(this.basePath, storageKey.split('/').slice(0, -1).join('/'));
      try {
        await fs.rmdir(dirPath);
      } catch {
        // Directory not empty — that's fine
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException(`File not found: ${storageKey}`);
      }
      throw err;
    }
  }
}
