import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class NotificationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.query?.tenantId || request.body?.tenantId || request.params?.tenantId;
    const notificationId = request.params?.id;

    if (!tenantId) throw new ForbiddenException('tenantId is required');

    if (notificationId) {
      const notification = await this.prisma.forTenant(tenantId).notificationInstance.findFirst({
        where: { id: notificationId, tenantId },
      });
      if (!notification) throw new ForbiddenException('Notification not found or access denied');
    }

    (request as any).tenantId = tenantId;
    return true;
  }
}
