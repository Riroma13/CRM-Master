import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as zlib from 'zlib';
import { PrismaService } from '../../common/prisma.service';
import { PluginValidatorService } from './plugin-validator.service';
import { PluginRegistryService } from './registry/plugin-registry.service';
import type { PluginManifestOutput } from '@shared/plugin';

const PLUGINS_DIR = process.env.PLUGINS_STORAGE_PATH
  || path.join(process.cwd(), 'data', 'plugins');

interface PluginManifestJson {
  name: string;
  version: string;
  description?: string;
  author?: string;
  extensionApi?: string;
  eventTypes?: string[];
  permissions?: string[];
  allowedDomains?: string[];
  schemaVersion?: number;
  [key: string]: unknown;
}

@Injectable()
export class PluginManagerService {
  private readonly logger = new Logger(PluginManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: PluginValidatorService,
    private readonly registry: PluginRegistryService,
  ) {}

  async install(
    tenantId: string,
    packageBuffer: Buffer,
  ): Promise<{ pluginId: string; status: string }> {
    this.validator.validatePackage(packageBuffer);

    const contentHash = crypto.createHash('sha256').update(packageBuffer).digest('hex');

    const rawManifest = this.extractManifest(packageBuffer);
    const manifest = this.validator.validateManifest(rawManifest);

    await this.validator.checkName(tenantId, manifest.name);

    const { id: pluginId } = await this.registry.register(tenantId, manifest, contentHash);

    await this.storePackage(tenantId, pluginId, packageBuffer);

    this.logger.log(`Plugin installed: ${pluginId} (${manifest.name} v${manifest.version})`);

    return { pluginId, status: 'active' };
  }

  async activate(tenantId: string, pluginId: string): Promise<void> {
    const plugin = await this.registry.get(tenantId, pluginId);
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    await this.prisma.admin.plugin.update({
      where: { id: pluginId },
      data: { status: 'active' },
    });

    this.logger.log(`Plugin activated: ${pluginId}`);
  }

  async deactivate(tenantId: string, pluginId: string): Promise<void> {
    const plugin = await this.registry.get(tenantId, pluginId);
    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    await this.prisma.admin.plugin.update({
      where: { id: pluginId },
      data: { status: 'inactive' },
    });

    this.logger.log(`Plugin deactivated: ${pluginId}`);
  }

  async uninstall(tenantId: string, pluginId: string): Promise<void> {
    await this.deactivate(tenantId, pluginId);

    const pluginDir = path.join(PLUGINS_DIR, tenantId, pluginId);
    try {
      await fs.rm(pluginDir, { recursive: true, force: true });
    } catch {
      this.logger.warn(`Failed to remove plugin directory: ${pluginDir}`);
    }

    await this.registry.unregister(tenantId, pluginId);

    this.logger.log(`Plugin uninstalled: ${pluginId}`);
  }

  private extractManifest(buffer: Buffer): PluginManifestJson {
    const isTgz = buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
    const isZip = buffer.length > 4 && buffer.readUInt32LE(0) === 0x04034b50;

    if (isTgz) return this.extractManifestFromTgz(buffer);
    if (isZip) return this.extractManifestFromZip(buffer);

    throw new Error('Unsupported package format');
  }

  private extractManifestFromTgz(buffer: Buffer): PluginManifestJson {
    let decompressed: Buffer;
    try {
      decompressed = zlib.gunzipSync(buffer);
    } catch {
      throw new Error('Failed to decompress tgz package');
    }

    let offset = 0;
    while (offset + 512 <= decompressed.length) {
      const header = decompressed.subarray(offset, offset + 512);
      if (header[0] === 0) break;

      const rawName = header.subarray(0, 100).toString('utf-8');
      const name = rawName.replace(/\0.*$/, '');
      const sizeStr = header.subarray(124, 136).toString('utf-8').replace(/\0.*$/, '');
      const size = parseInt(sizeStr, 8);

      if (isNaN(size) || size < 0) break;

      offset += 512;

      if (name === 'manifest.json' || name.endsWith('/manifest.json')) {
        const content = decompressed.subarray(offset, offset + size).toString('utf-8');
        return JSON.parse(content) as PluginManifestJson;
      }

      offset += Math.ceil(size / 512) * 512;
    }

    throw new Error('manifest.json not found in package');
  }

  private extractManifestFromZip(buffer: Buffer): PluginManifestJson {
    let eocdOffset = -1;
    const searchStart = Math.max(0, buffer.length - 65557);
    for (let i = buffer.length - 22; i >= searchStart; i--) {
      if (
        buffer[i] === 0x50 && buffer[i + 1] === 0x4b
        && buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('Invalid zip file: end of central directory record not found');
    }

    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
    const cdEntries = buffer.readUInt16LE(eocdOffset + 8);

    let offset = cdOffset;
    for (let i = 0; i < cdEntries; i++) {
      if (offset + 46 > buffer.length) break;

      const sig = buffer.readUInt32LE(offset);
      if (sig !== 0x02014b50) break;

      const compressionMethod = buffer.readUInt16LE(offset + 10);
      const compressedSize = buffer.readUInt32LE(offset + 20);
      const uncompressedSize = buffer.readUInt32LE(offset + 24);
      const fileNameLength = buffer.readUInt16LE(offset + 28);
      const extraFieldLength = buffer.readUInt16LE(offset + 30);
      const commentLength = buffer.readUInt16LE(offset + 32);
      const localHeaderOffset = buffer.readUInt32LE(offset + 42);

      const fileName = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString('utf-8');

      if (fileName === 'manifest.json' || fileName.endsWith('/manifest.json')) {
        if (localHeaderOffset + 30 > buffer.length) break;

        const lfhFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
        const lfhExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);

        const dataOffset = localHeaderOffset + 30 + lfhFileNameLen + lfhExtraLen;

        let data: Buffer;
        if (compressionMethod === 0) {
          data = buffer.subarray(dataOffset, dataOffset + uncompressedSize);
        } else if (compressionMethod === 8) {
          const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
          data = zlib.inflateRawSync(compressed);
        } else {
          throw new Error(`Unsupported zip compression method: ${compressionMethod}`);
        }

        return JSON.parse(data.toString('utf-8')) as PluginManifestJson;
      }

      offset += 46 + fileNameLength + extraFieldLength + commentLength;
    }

    throw new Error('manifest.json not found in package');
  }

  private async storePackage(
    tenantId: string,
    pluginId: string,
    buffer: Buffer,
  ): Promise<void> {
    const dir = path.join(PLUGINS_DIR, tenantId, pluginId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'package'), buffer);
  }
}
