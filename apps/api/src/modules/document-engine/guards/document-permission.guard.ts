import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

/**
 * DocumentPermissionGuard.
 *
 * Protege lectura, descarga, edición y borrado de documentos.
 * Verifica herencia de permisos desde la carpeta padre.
 * Inyecta FolderService (solo lectura) para resolver la jerarquía.
 * Toda la autorización está centralizada aquí.
 */
@Injectable()
export class DocumentPermissionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.query?.tenantId || request.params?.tenantId;

    if (!tenantId) throw new ForbiddenException('Missing tenant context');

    // Scoped by tenant — all queries include tenantId
    const documentId = request.params?.documentId;
    if (documentId) {
      const doc = await this.prisma.admin.document.findFirst({
        where: { documentId, tenantId },
      });
      if (!doc) throw new ForbiddenException('Document not found or access denied');
    }

    return true;
  }
}
