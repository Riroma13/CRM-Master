import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import {
  LifecyclePolicyInputSchema,
  LifecycleTarget,
  LifecycleTargetSchema,
} from '../../../../../packages/shared/src/lifecycle';
import { PrismaService } from '../../common/prisma.service';
import { TrustedJobContext } from '../jobs/jobs.contracts';
import { LifecyclePolicyService } from './lifecycle-policy.service';

@ApiTags('Lifecycle')
@ApiBearerAuth()
@Controller('api/v1/lifecycle')
export class LifecycleController {
  constructor(
    private readonly policyService: LifecyclePolicyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('policies/:target')
  @ApiOperation({ summary: 'Get the lifecycle policy for the Host tenant' })
  async getPolicy(@Req() request: any, @Param('target') target: string) {
    const lifecycleTarget = this.parseTarget(target);
    const policy = await this.policyService.getPolicy(this.context(request), lifecycleTarget);
    if (!policy) throw new NotFoundException('Lifecycle policy not found');
    return policy;
  }

  @Put('policies/:target')
  @ApiOperation({ summary: 'Create or replace a Host tenant lifecycle policy' })
  async upsertPolicy(
    @Req() request: any,
    @Param('target') target: string,
    @Body() body: unknown,
  ) {
    const lifecycleTarget = this.parseTarget(target);
    const parsed = LifecyclePolicyInputSchema.safeParse(body);
    if (!parsed.success || parsed.data.target !== lifecycleTarget) {
      throw new BadRequestException('Lifecycle policy target does not match route');
    }
    return this.policyService.upsertPolicy(this.context(request), parsed.data, lifecycleTarget);
  }

  @Delete('policies/:target')
  @ApiOperation({ summary: 'Disable the Host tenant lifecycle policy' })
  async disablePolicy(@Req() request: any, @Param('target') target: string) {
    const lifecycleTarget = this.parseTarget(target);
    const policy = await this.policyService.setEnabled(this.context(request), lifecycleTarget, false);
    if (!policy) throw new NotFoundException('Lifecycle policy not found');
    return policy;
  }

  @Get('policies/:target/runs')
  @ApiOperation({ summary: 'List the Host tenant lifecycle run ledger' })
  async listRuns(
    @Req() request: any,
    @Param('target') target: string,
    @Query('page') pageInput = '1',
    @Query('limit') limitInput = '20',
  ) {
    const lifecycleTarget = this.parseTarget(target);
    const page = this.parsePageValue(pageInput, 'page');
    const limit = this.parsePageValue(limitInput, 'limit');
    const tenantId = this.tenantId(request);
    const scoped = this.prisma.forTenant(tenantId) as any;
    const policy = await scoped.dataLifecyclePolicy.findFirst({
      where: { tenantId, target: lifecycleTarget },
      select: { id: true },
    });
    if (!policy) throw new NotFoundException('Lifecycle policy not found');

    const where = { tenantId, policyId: policy.id };
    const [data, total, aggregate] = await Promise.all([
      scoped.dataLifecycleRun.findMany({
        where,
        orderBy: { scheduledFor: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      scoped.dataLifecycleRun.count({ where }),
      scoped.dataLifecycleRun.aggregate({ where, _sum: { purgedCount: true } }),
    ]);

    return {
      data,
      pagination: { page, limit, total },
      purgedCount: aggregate._sum?.purgedCount ?? 0,
    };
  }

  private context(request: any): TrustedJobContext {
    return {
      tenantId: this.tenantId(request),
      actorId: request.user?.id,
      organizationId: request.user?.organizationId,
      correlationId: request.headers?.['x-correlation-id'],
      idempotencyKey: request.headers?.['x-idempotency-key'] ?? randomUUID(),
    };
  }

  private tenantId(request: any): string {
    if (typeof request.tenantId !== 'string' || request.tenantId.length === 0) {
      throw new BadRequestException('Tenant could not be resolved from Host');
    }
    return request.tenantId;
  }

  private parseTarget(value: string): LifecycleTarget {
    const parsed = LifecycleTargetSchema.safeParse(value);
    if (!parsed.success) throw new BadRequestException('Invalid lifecycle target');
    return parsed.data;
  }

  private parsePageValue(value: string, name: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
      throw new BadRequestException(`Invalid ${name}`);
    }
    return parsed;
  }
}
