import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';

const MAX_FOLDER_DEPTH = 5;

@Injectable()
export class FolderService {
  private readonly logger = new Logger(FolderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, name: string, parentId?: string) {
    if (parentId) {
      const depth = await this.getDepth(tenantId, parentId);
      if (depth >= MAX_FOLDER_DEPTH) {
        throw new Error(`Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`);
      }
    }
    return this.prisma.admin.documentFolder.create({
      data: { tenantId, name, parentId: parentId ?? null },
    });
  }

  async list(tenantId: string) {
    return this.prisma.admin.documentFolder.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async getTree(tenantId: string) {
    const folders = await this.prisma.admin.documentFolder.findMany({
      where: { tenantId },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    });
    return this.buildTree(folders, null);
  }

  async update(folderId: string, tenantId: string, name: string) {
    return this.prisma.admin.documentFolder.updateMany({
      where: { id: folderId, tenantId },
      data: { name },
    });
  }

  async delete(folderId: string, tenantId: string) {
    const children = await this.prisma.admin.documentFolder.findMany({
      where: { parentId: folderId, tenantId },
    });
    if (children.length > 0) {
      throw new Error('Cannot delete folder with children');
    }
    return this.prisma.admin.documentFolder.deleteMany({
      where: { id: folderId, tenantId },
    });
  }

  private async getDepth(tenantId: string, folderId: string): Promise<number> {
    let depth = 0;
    let currentId: string | null = folderId;
    while (currentId && depth <= MAX_FOLDER_DEPTH) {
      depth++;
      const row: { parentId: string | null } | null = await this.prisma.admin.documentFolder.findFirst({
        where: { id: currentId, tenantId },
        select: { parentId: true },
      });
      currentId = row?.parentId ?? null;
    }
    return depth;
  }

  private buildTree(folders: any[], parentId: string | null): any[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({
        ...f,
        children: this.buildTree(folders, f.id),
      }));
  }
}
