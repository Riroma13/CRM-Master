import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { PluginManifestOutput } from '@shared/plugin';

@Injectable()
export class PluginRegistryService {
  private readonly logger = new Logger(PluginRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async register(
    tenantId: string,
    manifest: PluginManifestOutput,
    contentHash: string,
  ): Promise<{ id: string }> {
    const plugin = await this.prisma.admin.plugin.create({
      data: {
        tenantId,
        name: manifest.name,
        version: manifest.version,
        manifest: manifest as object,
        contentHash,
        schemaVersion: manifest.schemaVersion ?? 1,
        hooks: {
          create: manifest.eventTypes.map((eventType: string) => ({
            tenantId,
            eventType,
            handler: 'onEvent',
            priority: 0,
          })),
        },
      },
    });

    this.logger.log(`Plugin registered: ${plugin.id} (${manifest.name} v${manifest.version})`);
    return { id: plugin.id };
  }

  async get(tenantId: string, pluginId: string) {
    const plugin = await this.prisma.admin.plugin.findFirst({
      where: { id: pluginId, tenantId },
      include: { hooks: true },
    });

    return plugin ?? null;
  }

  async list(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) {
      where.status = status;
    }

    return this.prisma.admin.plugin.findMany({
      where,
      include: { hooks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByEventType(tenantId: string, eventType: string) {
    return this.prisma.admin.plugin.findMany({
      where: {
        tenantId,
        status: 'active',
        hooks: {
          some: { eventType },
        },
      },
      include: { hooks: true },
    });
  }

  async unregister(tenantId: string, pluginId: string): Promise<void> {
    const plugin = await this.prisma.admin.plugin.findFirst({
      where: { id: pluginId, tenantId },
      select: { id: true },
    });

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    await this.prisma.admin.plugin.delete({
      where: { id: pluginId },
    });

    this.logger.log(`Plugin unregistered: ${pluginId}`);
  }
}
