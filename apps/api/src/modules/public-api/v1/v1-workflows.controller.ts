import { Controller, Get, Param, Query, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import type { Request } from 'express';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { ScopeGuard, RequireScope } from '../guards/scope.guard';
import { RateLimitGuard } from '../rate-limit/rate-limit.guard';
import { ExternalAuth } from '../../../common/decorators/public.decorator';
import { WorkflowService } from '../../workflow/workflow.service';
import { toV1 } from './mappers/workflow-response.mapper';
import type { V1WorkflowResponse, PublicApiResponse } from '@shared/public-api';

type PublicApiRequest = Request & { tenantId: string };

@Controller('api/v1/public/workflows')
@ExternalAuth('api-token-deferred')
@UseGuards(TokenAuthGuard, ScopeGuard, RateLimitGuard)
export class V1WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @RequireScope('workflows:read')
  async list(
    @Req() request: PublicApiRequest,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PublicApiResponse<V1WorkflowResponse[]>> {
    const result = await this.workflowService.listInstances(request.tenantId, status, Number(page) || 1, Number(limit) || 20);
    return {
      data: result.data.map(toV1),
      meta: result.pagination,
    };
  }

  @Get(':id')
  @RequireScope('workflows:read')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: PublicApiRequest,
  ): Promise<PublicApiResponse<V1WorkflowResponse>> {
    const instance = await this.workflowService.getInstance(request.tenantId, id);
    return { data: toV1(instance) };
  }
}
