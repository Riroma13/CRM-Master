import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class WorkflowDefinitionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.workflowContext?.tenantId;
    const definitionId = request.params.id ?? request.body?.definitionId;

    if (!tenantId) throw new ForbiddenException('WORKFLOW_TENANT_CONTEXT_REQUIRED');

    if (definitionId) {
      const definition = await this.prisma.forTenant(tenantId).workflowDefinition.findFirst({
        where: { id: definitionId, tenantId },
      });
      if (!definition) throw new ForbiddenException('Workflow definition not found or access denied');
    }

    return true;
  }
}
