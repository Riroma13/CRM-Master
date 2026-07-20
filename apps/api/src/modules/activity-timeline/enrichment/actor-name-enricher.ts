import { Injectable, Logger } from '@nestjs/common';
import { EnrichmentContext, EnrichmentResult } from '../../../../../../packages/shared/src/activity-timeline';
import { PrismaService } from '../../../common/prisma.service';

@Injectable()
export class ActorNameEnricher {
  readonly name = 'actor-name';
  readonly description = 'Resolves actor display name';

  private readonly logger = new Logger(ActorNameEnricher.name);

  constructor(private readonly prisma: PrismaService) {}

  async enrich(context: EnrichmentContext): Promise<EnrichmentResult> {
    if (!context.actor) {
      return {};
    }

    const scoped = this.prisma.forTenant(context.tenantId);

    try {
      const user = await (scoped as any).user.findFirst({
        where: {
          OR: [
            { email: context.actor },
            { name: context.actor },
          ],
        },
        select: { name: true },
      });

      if (user?.name) {
        return { actorName: user.name };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve actor name for "${context.actor}": ${(error as Error).message}`,
      );
    }

    return {};
  }
}
