import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class WorkflowExecutionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.query.tenantId || request.body?.tenantId;
    const instanceId = request.params.id;

    if (!tenantId) throw new ForbiddenException('tenantId is required');

    if (instanceId) {
      const instance = await this.prisma.forTenant(tenantId).workflowInstance.findFirst({
        where: { id: instanceId, tenantId },
      });
      if (!instance) throw new ForbiddenException('Workflow instance not found or access denied');
    }

    (request as any).tenantId = tenantId;
    return true;
  }
}
