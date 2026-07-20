import { Injectable, Logger } from '@nestjs/common';
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
