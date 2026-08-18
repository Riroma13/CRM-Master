import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';
import { PrismaService } from '../../common/prisma.service';
import { validatePluginManifest } from '@shared/plugin';
import type { PluginManifestOutput } from '@shared/plugin';

const MAX_PACKAGE_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class PluginValidatorService {
  private readonly logger = new Logger(PluginValidatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  validatePackage(buffer: Buffer): void {
    if (buffer.length > MAX_PACKAGE_SIZE_BYTES) {
      throw new Error(
        `Package exceeds maximum size of 10MB (got ${(buffer.length / 1024 / 1024).toFixed(1)}MB)`,
      );
    }

    const isTgz = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
    const isZip = buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50;

    if (!isTgz && !isZip) {
      throw new Error('Invalid package format. Must be tgz or zip');
    }

    if (isTgz) this.validateTar(buffer);
    else this.validateZip(buffer);
  }

  private validateTar(buffer: Buffer): void {
    let tar: Buffer;
    try { tar = zlib.gunzipSync(buffer); } catch { throw new Error('Failed to decompress tgz package'); }
    let offset = 0;
    let manifests = 0;
    while (offset + 512 <= tar.length && tar[offset] !== 0) {
      const header = tar.subarray(offset, offset + 512);
      const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
      const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, ''), 8);
      if (!Number.isFinite(size) || size < 0 || offset + 512 + size > tar.length) throw new Error('Invalid tar entry');
      if (name !== 'manifest.json') throw new Error('Archive may contain manifest.json only');
      manifests++;
      offset += 512 + Math.ceil(size / 512) * 512;
    }
    if (manifests !== 1) throw new Error('Archive must contain exactly one manifest.json');
  }

  private validateZip(buffer: Buffer): void {
    const eocd = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0 || eocd + 22 > buffer.length) throw new Error('Invalid zip file');
    const count = buffer.readUInt16LE(eocd + 8);
    const cdOffset = buffer.readUInt32LE(eocd + 16);
    let offset = cdOffset;
    let manifests = 0;
    for (let i = 0; i < count; i++) {
      if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Invalid zip entry');
      const nameLength = buffer.readUInt16LE(offset + 28);
      const extraLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
      if (name !== 'manifest.json') throw new Error('Archive may contain manifest.json only');
      manifests++;
      offset += 46 + nameLength + extraLength + commentLength;
    }
    if (manifests !== 1) throw new Error('Archive must contain exactly one manifest.json');
  }

  validateManifest(data: unknown): PluginManifestOutput {
    return validatePluginManifest(data);
  }

  async checkName(tenantId: string, name: string): Promise<void> {
    const existing = await this.prisma.admin.plugin.findFirst({
      where: { tenantId, name },
      select: { id: true },
    });

    if (existing) {
      throw new Error(`Plugin "${name}" is already installed for this tenant`);
    }
  }
}
