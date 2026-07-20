import {
  Controller, Get, Post, Param, Query, Body,
  ParseUUIDPipe, HttpCode, HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { DefinitionService } from './definition.service';
import { WorkflowDefinitionGuard } from './guards/workflow-definition.guard';
import { WorkflowExecutionGuard } from './guards/workflow-execution.guard';

@Controller('api/v1/workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly definitionService: DefinitionService,
  ) {}

  // ─── Definition CRUD ────────────────────────────────────────

  @Post('definitions')
  @UseGuards(WorkflowDefinitionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDefinition(
    @Body() body: { name: string; description?: string; nodes: any; startNode: string },
    @Query('tenantId') tenantId: string,
  ) {
    return this.definitionService.create(tenantId, body);
  }

  @Get('definitions')
  @UseGuards(WorkflowDefinitionGuard)
  async listDefinitions(
    @Query('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.definitionService.findAll(tenantId, Number(page) || 1, Number(limit) || 20);
  }

  @Get('definitions/:id')
  @UseGuards(WorkflowDefinitionGuard)
  async getDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.definitionService.findOne(tenantId, id);
  }

  @Post('definitions/:id/versions')
  @UseGuards(WorkflowDefinitionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: { nodes: any; startNode: string },
  ) {
    return this.definitionService.createVersion(tenantId, id, body);
  }

  @Post('definitions/:id/publish')
  @UseGuards(WorkflowDefinitionGuard)
  async publishDefinition(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.definitionService.publish(tenantId, id);
  }

  // ─── Instance Management ────────────────────────────────────

  @Post('instances')
  @HttpCode(HttpStatus.CREATED)
  async startWorkflow(
    @Body() body: { definitionId: string; variables?: Record<string, unknown>; correlationId?: string },
    @Query('tenantId') tenantId: string,
  ) {
    return this.workflowService.startWorkflow(tenantId, body.definitionId, body.variables, body.correlationId);
  }

  @Get('instances')
  async listInstances(
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowService.listInstances(tenantId, status, Number(page) || 1, Number(limit) || 20);
  }

  @Get('instances/:id')
  @UseGuards(WorkflowExecutionGuard)
  async getInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.workflowService.getInstance(tenantId, id);
  }

  @Post('instances/:id/resume')
  @UseGuards(WorkflowExecutionGuard)
  async resumeInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.workflowService.resumeWorkflow(tenantId, id, body);
  }

  @Post('instances/:id/suspend')
  @UseGuards(WorkflowExecutionGuard)
  async suspendInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.workflowService.suspendWorkflow(tenantId, id);
  }

  @Post('instances/:id/cancel')
  @UseGuards(WorkflowExecutionGuard)
  async cancelInstance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.workflowService.cancelWorkflow(tenantId, id);
  }

  @Post('instances/:id/retry/:executionId')
  @UseGuards(WorkflowExecutionGuard)
  async retryStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('executionId', ParseUUIDPipe) executionId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.workflowService.retryStep(tenantId, id, executionId);
  }
}
