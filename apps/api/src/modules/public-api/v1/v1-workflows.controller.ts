import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard, RequireScope } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { WorkflowService } from '../../workflow/workflow.service';
import { toV1 } from './mappers/workflow-response.mapper';
import type { V1WorkflowResponse, PublicApiResponse } from '@shared/public-api';

@Controller('api/v1/public/workflows')
@UseGuards(TokenAuthGuard, ScopeGuard, RateLimitGuard)
export class V1WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @RequireScope('workflows:read')
  async list(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PublicApiResponse<V1WorkflowResponse[]>> {
    const result = await this.workflowService.listInstances(tenantId, status, Number(page) || 1, Number(limit) || 20);
    return {
      data: result.data.map(toV1),
      meta: result.pagination,
    };
  }

  @Get(':id')
  @RequireScope('workflows:read')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
  ): Promise<PublicApiResponse<V1WorkflowResponse>> {
    const instance = await this.workflowService.getInstance(tenantId, id);
    return { data: toV1(instance) };
  }
}
