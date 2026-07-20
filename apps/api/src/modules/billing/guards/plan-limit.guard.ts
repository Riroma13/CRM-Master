import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  HttpException,
  HttpStatus,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanLimitsService } from '../plan/plan-limits.service';

export const PLAN_LIMIT_METRIC_KEY = 'plan_limit_metric';

export const PlanLimit = (metric: string) =>
  applyDecorators(
    SetMetadata(PLAN_LIMIT_METRIC_KEY, metric),
  );

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.getAllAndOverride<string>(
      PLAN_LIMIT_METRIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metric) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId || request.user?.tenantId;

    if (!tenantId) {
      return true;
    }

    const result = await this.planLimitsService.checkLimit(tenantId, metric);

    if (!result.allowed) {
      throw new HttpException(
        {
          error: 'plan_limit_exceeded',
          metric: result.metric,
          current: result.current,
          limit: result.limit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (
      result.limit > 0 &&
      result.current >= result.limit * 0.8
    ) {
      request.res?.header('X-Limit-Warning', `${result.metric}: ${result.current}/${result.limit}`);
    }

    return true;
  }
}
