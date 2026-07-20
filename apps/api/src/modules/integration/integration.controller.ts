import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { CreateConnectorSchema, UpdateConnectorSchema, ExecuteSchema, ExecutionQuery } from './dto';
import { PrismaService } from '../../common/prisma.service';

@Controller('api/v1/integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('connectors')
  async listConnectors(@Query('tenantId') tenantId: string) {
    return this.prisma.admin.integrationConnector.findMany({ where: { tenantId } });
  }

  @Post('connectors')
  @HttpCode(HttpStatus.CREATED)
  async createConnector(@Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = CreateConnectorSchema.parse(body);
    return this.prisma.admin.integrationConnector.create({ data: { ...parsed, tenantId } });
  }

  @Patch('connectors/:id')
  async updateConnector(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = UpdateConnectorSchema.parse(body);
    await this.prisma.admin.integrationConnector.updateMany({ where: { id, tenantId }, data: parsed });
    return { updated: true };
  }

  @Delete('connectors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConnector(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    await this.prisma.admin.integrationConnector.deleteMany({ where: { id, tenantId } });
  }

  @Post('connectors/:id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async execute(@Param('id') connectorId: string, @Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = ExecuteSchema.parse(body);
    return this.integrationService.execute(connectorId, tenantId, parsed.operation, parsed.input);
  }

  @Get('executions')
  async listExecutions(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = ExecutionQuery.parse(query);
    return this.integrationService.listExecutions(tenantId, parsed);
  }

  @Get('executions/dlq')
  async listDlq(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = ExecutionQuery.parse(query);
    return this.integrationService.listExecutions(tenantId, { ...parsed, dlq: true });
  }

  @Post('executions/:id/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  async replay(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    return this.integrationService.replay(id, tenantId);
  }
}
