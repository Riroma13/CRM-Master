import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

export type DocumentRole = 'owner' | 'editor' | 'viewer';

export interface FolderPermission {
  role: DocumentRole;
  folderId: string;
  inherited: boolean;
}

@Injectable()
export class PermissionInheritance {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermission(tenantId: string, folderId: string, userId: string): Promise<FolderPermission | null> {
    const folder = await this.prisma.admin.documentFolder.findFirst({
      where: { id: folderId, tenantId },
    });
    if (!folder) return null;

    // Inherit from parent chain
    let current = folder;
    while (current.parentId) {
      const parent = await this.prisma.admin.documentFolder.findFirst({
        where: { id: current.parentId, tenantId },
      });
      if (!parent) break;
      current = parent;
    }

    return { role: 'viewer', folderId: current.id, inherited: current.id !== folderId };
  }
}
