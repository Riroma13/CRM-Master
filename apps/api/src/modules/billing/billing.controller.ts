import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { BillingGuard, BILLING_ADMIN_KEY } from './guards/billing.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { PlanCatalogService } from './plan/plan-catalog.service';
import { SubscriptionEngine } from './subscription/subscription-engine';
import { MeteringEngine } from './metering/metering-engine';
import { InvoiceEngine } from './invoice/invoice-engine';
import { PlanLimitsService } from './plan/plan-limits.service';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(BillingGuard)
@Controller()
export class BillingController {
  constructor(
    private readonly planCatalogService: PlanCatalogService,
    private readonly subscriptionEngine: SubscriptionEngine,
    private readonly meteringEngine: MeteringEngine,
    private readonly invoiceEngine: InvoiceEngine,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  // ─── Tenant-facing endpoints ──────────────────────────────────────

  @Get('api/v1/billing/subscription')
  @ApiOperation({ summary: 'Get current subscription for the tenant' })
  async getSubscription(@TenantId() tenantId: string) {
    const subscription = await this.subscriptionEngine.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for this tenant');
    }
    return subscription;
  }

  @Get('api/v1/billing/plan')
  @ApiOperation({ summary: 'Get current plan details with limits' })
  async getCurrentPlan(@TenantId() tenantId: string) {
    const subscription = await this.subscriptionEngine.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for this tenant');
    }
    const plan = await this.planCatalogService.getPlan(subscription.planId);
    return { plan, subscription };
  }

  @Get('api/v1/billing/usage')
  @ApiOperation({ summary: 'Get current usage meters for the tenant' })
  async getUsage(@TenantId() tenantId: string) {
    const subscription = await this.subscriptionEngine.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('No subscription found for this tenant');
    }
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const usage = await this.meteringEngine.getAllUsage(tenantId, periodStart, periodEnd);
    return usage;
  }

  @Get('api/v1/billing/invoices')
  @ApiOperation({ summary: 'List invoices for the tenant' })
  async listInvoices(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.invoiceEngine.listInvoices(
      tenantId,
      status as any,
      page ? parseInt(page, 10) : 1,
      perPage ? parseInt(perPage, 10) : 20,
    );
  }

  @Get('api/v1/billing/invoices/:id')
  @ApiOperation({ summary: 'Get a single invoice' })
  async getInvoice(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const invoice = await this.invoiceEngine.getInvoice(id);
    if (invoice.tenantId !== tenantId) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  @Post('api/v1/billing/subscription/change-plan')
  @ApiOperation({ summary: 'Upgrade or downgrade plan' })
  async changePlan(
    @TenantId() tenantId: string,
    @Body() body: { planId: string },
  ) {
    if (!body.planId) {
      throw new BadRequestException('planId is required');
    }
    return this.subscriptionEngine.changePlan(tenantId, body.planId);
  }

  @Post('api/v1/billing/subscription/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@TenantId() tenantId: string) {
    return this.subscriptionEngine.cancelSubscription(tenantId);
  }

  @Get('api/v1/billing/plans')
  @ApiOperation({ summary: 'List available plans' })
  async listPlans() {
    return this.planCatalogService.listPlans(true);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────

  @Get('api/v1/admin/billing/plans')
  @ApiOperation({ summary: 'List all plans (admin)' })
  @ApiBearerAuth()
  async adminListPlans() {
    return this.planCatalogService.listPlans(false);
  }

  @Post('api/v1/admin/billing/plans')
  @ApiOperation({ summary: 'Create a new plan (admin)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Plan created' })
  async adminCreatePlan(@Body() body: any) {
    return this.planCatalogService.createPlan(body);
  }

  @Put('api/v1/admin/billing/plans/:id')
  @ApiOperation({ summary: 'Update a plan (admin)' })
  async adminUpdatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
  ) {
    return this.planCatalogService.updatePlan(id, body);
  }

  @Post('api/v1/admin/billing/subscriptions/:tenantId/override')
  @ApiOperation({ summary: 'Admin override subscription for a tenant' })
  @ApiBearerAuth()
  async adminOverrideSubscription(
    @Param('tenantId') tenantId: string,
    @Body() body: { planId?: string; status?: string },
  ) {
    if (body.planId) {
      return this.subscriptionEngine.changePlan(tenantId, body.planId);
    }
    if (body.status) {
      return this.subscriptionEngine.updateStatus(tenantId, body.status as any);
    }
    throw new BadRequestException('Provide planId or status to override');
  }
}
