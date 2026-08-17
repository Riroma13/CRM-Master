import {
  Controller, Get, Post, Param, Query, Body,
  ParseUUIDPipe, HttpCode, HttpStatus,
  UseGuards, Req,
} from '@nestjs/common';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { IdentityOrganizationGuard } from '../identity/identity-organization.guard';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { WorkflowDefinitionGuard } from './guards/workflow-definition.guard';
import { WorkflowExecutionGuard } from './guards/workflow-execution.guard';
import { WorkflowTenantContextGuard } from './guards/workflow-tenant-context.guard';

@Controller('api/v1/workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly definitionService: DefinitionService,
  ) {}

  // ─── Definition CRUD ────────────────────────────────────────

  @Post('definitions')
  @RequirePermission('workflow', 'write')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowDefinitionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDefinition(
    @Body() body: { name: string; description?: string; nodes: any; startNode: string },
    @Req() request: any,
  ) {
    return this.definitionService.create(request.workflowContext.tenantId, body);
  }

  @Get('definitions')
  @RequirePermission('workflow', 'read')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowDefinitionGuard)
  async listDefinitions(
    @Req() request: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.definitionService.findAll(request.workflowContext.tenantId, Number(page) || 1, Number(limit) || 20);
  }

  @Get('definitions/:id')
  @RequirePermission('workflow', 'read')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowDefinitionGuard)
  async getDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
  ) {
    return this.definitionService.findOne(request.workflowContext.tenantId, id);
  }

  @Post('definitions/:id/versions')
  @RequirePermission('workflow', 'write')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowDefinitionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
    @Body() body: { nodes: any; startNode: string },
  ) {
    return this.definitionService.createVersion(request.workflowContext.tenantId, id, body);
  }

  @Post('definitions/:id/publish')
  @RequirePermission('workflow', 'write')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowDefinitionGuard)
  async publishDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
  ) {
    return this.definitionService.publish(request.workflowContext.tenantId, id);
  }

  // ─── Instance Management ────────────────────────────────────

  @Post('instances')
  @RequirePermission('workflow', 'execute')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowDefinitionGuard)
  @HttpCode(HttpStatus.CREATED)
  async startWorkflow(
    @Body() body: { definitionId: string; variables?: Record<string, unknown>; correlationId?: string },
    @Req() request: any,
  ) {
    return this.workflowService.startWorkflow(request.workflowContext.tenantId, body.definitionId, body.variables, body.correlationId);
  }

  @Get('instances')
  @RequirePermission('workflow', 'read')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard)
  async listInstances(
    @Req() request: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowService.listInstances(request.workflowContext.tenantId, status, Number(page) || 1, Number(limit) || 20);
  }

  @Get('instances/:id')
  @RequirePermission('workflow', 'read')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowExecutionGuard)
  async getInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
  ) {
    return this.workflowService.getInstance(request.workflowContext.tenantId, id);
  }

  @Post('instances/:id/resume')
  @RequirePermission('workflow', 'execute')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowExecutionGuard)
  async resumeInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.workflowService.resumeWorkflow(request.workflowContext.tenantId, id, body);
  }

  @Post('instances/:id/suspend')
  @RequirePermission('workflow', 'execute')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowExecutionGuard)
  async suspendInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
  ) {
    return this.workflowService.suspendWorkflow(request.workflowContext.tenantId, id);
  }

  @Post('instances/:id/cancel')
  @RequirePermission('workflow', 'execute')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowExecutionGuard)
  async cancelInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: any,
  ) {
    return this.workflowService.cancelWorkflow(request.workflowContext.tenantId, id);
  }

  @Post('instances/:id/retry/:executionId')
  @RequirePermission('workflow', 'execute')
  @UseGuards(IdentityOrganizationGuard, WorkflowTenantContextGuard, WorkflowExecutionGuard)
  async retryStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('executionId', ParseUUIDPipe) executionId: string,
    @Req() request: any,
  ) {
    return this.workflowService.retryStep(request.workflowContext.tenantId, id, executionId);
  }
}
