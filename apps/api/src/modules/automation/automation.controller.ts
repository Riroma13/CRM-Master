import { Controller, Get, Post, Patch, Delete, Param, Query, Body, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AutomationEngine } from './automation.service';
import { CreateRuleSchema, UpdateRuleSchema, RuleListQuery, ExecutionQuery, ManualExecutionSchema } from './dto';
import { PrismaService } from '../../common/prisma.service';

@Controller('api/v1/automation')
export class AutomationController {
  constructor(
    private readonly engine: AutomationEngine,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Trigger + Action discovery ───────────────────────

  @Get('triggers')
  async listTriggers() {
    const { KNOWN_TRIGGERS } = await import('../../../../../packages/shared/src/automation');
    return { data: KNOWN_TRIGGERS };
  }

  // ─── Rules CRUD ────────────────────────────────────────

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(@Body() body: unknown, @Query('tenantId') tenantId: string) {
    const parsed = CreateRuleSchema.parse(body);
    const rule = await this.prisma.admin.automationRule.create({
      data: {
        tenantId,
        name: parsed.name,
        description: parsed.description,
        trigger: parsed.trigger,
        actions: parsed.actions,
        filters: parsed.filters ?? {},
        config: parsed.config ?? {},
        isActive: parsed.isActive,
      },
    });
    return rule;
  }

  @Get('rules')
  async listRules(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = RuleListQuery.parse(query);
    const where: any = { tenantId };
    if (parsed.trigger) where.trigger = parsed.trigger;
    if (parsed.isActive !== undefined) where.isActive = parsed.isActive;

    const [data, total] = await Promise.all([
      this.prisma.admin.automationRule.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admin.automationRule.count({ where }),
    ]);

    return { data, pagination: { page: parsed.page, limit: parsed.limit, total } };
  }

  @Get('rules/:id')
  async getRule(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    const rule = await this.prisma.admin.automationRule.findFirst({
      where: { id, tenantId },
    });
    return rule;
  }

  @Patch('rules/:id')
  async updateRule(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string, @Body() body: unknown) {
    const parsed = UpdateRuleSchema.parse(body);
    const rule = await this.prisma.admin.automationRule.updateMany({
      where: { id, tenantId },
      data: parsed,
    });
    return { updated: rule.count };
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string) {
    await this.prisma.admin.automationRule.deleteMany({
      where: { id, tenantId },
    });
  }

  // ─── Manual execution ──────────────────────────────────

  @Post('rules/:id/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async executeRule(@Param('id', ParseUUIDPipe) id: string, @Query('tenantId') tenantId: string, @Body() body: unknown) {
    const parsed = ManualExecutionSchema.parse(body);
    await this.engine.evaluate(parsed.trigger, tenantId, parsed.payload);
    return { status: 'dispatched' };
  }

  // ─── Execution history ─────────────────────────────────

  @Get('executions')
  async listExecutions(@Query() query: unknown, @Query('tenantId') tenantId: string) {
    const parsed = ExecutionQuery.parse(query);
    const where: any = { tenantId };
    if (parsed.ruleId) where.ruleId = parsed.ruleId;
    if (parsed.status) where.status = parsed.status;

    const [data, total] = await Promise.all([
      this.prisma.admin.automationExecution.findMany({
        where,
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
        orderBy: { createdAt: 'desc' },
        include: { steps: true },
      }),
      this.prisma.admin.automationExecution.count({ where }),
    ]);

    return { data, pagination: { page: parsed.page, limit: parsed.limit, total } };
  }
}
