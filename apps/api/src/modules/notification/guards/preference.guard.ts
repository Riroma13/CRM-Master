import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class PreferenceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.body?.tenantId || request.query?.tenantId;
    const userId = request.body?.userId;
    const preferenceId = request.params?.id;

    if (!tenantId) throw new ForbiddenException('tenantId is required');

    if (preferenceId) {
      const pref = await this.prisma.forTenant(tenantId).notificationPreference.findFirst({
        where: { id: preferenceId, tenantId },
      });
      if (!pref) throw new ForbiddenException('Preference not found or access denied');
    }

    (request as any).tenantId = tenantId;
    return true;
  }
}
