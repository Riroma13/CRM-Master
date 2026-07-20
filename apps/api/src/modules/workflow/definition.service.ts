import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DefinitionService {
  private readonly logger = new Logger(DefinitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; description?: string; nodes: any; startNode: string }) {
    const definition = await this.prisma.forTenant(tenantId).workflowDefinition.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        versions: {
          create: {
            version: 1,
            nodes: data.nodes,
            startNode: data.startNode,
          },
        },
      },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    return definition;
  }

  async findAll(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.forTenant(tenantId).workflowDefinition.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      }),
      this.prisma.forTenant(tenantId).workflowDefinition.count({ where: { tenantId } }),
    ]);
    return { data, pagination: { page, limit, total } };
  }

  async findOne(tenantId: string, id: string) {
    const definition = await this.prisma.forTenant(tenantId).workflowDefinition.findFirst({
      where: { id, tenantId },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!definition) throw new NotFoundException('Workflow definition not found');
    return definition;
  }

  async createVersion(tenantId: string, definitionId: string, data: { nodes: any; startNode: string }) {
    const definition = await this.findOne(tenantId, definitionId);
    const latestVersion = definition.versions[0];
    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const version = await this.prisma.forTenant(tenantId).workflowDefinitionVersion.create({
      data: {
        definitionId,
        version: nextVersion,
        nodes: data.nodes,
        startNode: data.startNode,
      },
    });
    return version;
  }

  async publish(tenantId: string, definitionId: string) {
    const definition = await this.findOne(tenantId, definitionId);
    const latestVersion = definition.versions[0];
    if (!latestVersion) throw new NotFoundException('No versions to publish');

    await this.prisma.forTenant(tenantId).workflowDefinitionVersion.updateMany({
      where: { definitionId, isPublished: true },
      data: { isPublished: false },
    });

    const published = await this.prisma.forTenant(tenantId).workflowDefinitionVersion.update({
      where: { id: latestVersion.id },
      data: { isPublished: true },
    });
    return published;
  }

  async getLatestPublished(tenantId: string, definitionId: string) {
    const version = await this.prisma.forTenant(tenantId).workflowDefinitionVersion.findFirst({
      where: { definitionId, isPublished: true },
      orderBy: { version: 'desc' },
    });
    if (!version) throw new NotFoundException('No published version found for this definition');
    return version;
  }
}
