import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { MeteringEngine } from '../metering/metering-engine';
import type { Plan, UsageMeter, InvoiceLine, Invoice, InvoiceStatus } from '@shared/billing';

export interface PaginatedInvoices {
  data: Invoice[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

@Injectable()
export class InvoiceEngine {
  private readonly logger = new Logger(InvoiceEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingStrategyFactory: PricingStrategyFactory,
    private readonly meteringEngine: MeteringEngine,
  ) {}

  async generateInvoice(
    subscriptionId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Invoice> {
    this.logger.log(
      `Generating invoice: subscription=${subscriptionId} period=${periodStart.toISOString()}-${periodEnd.toISOString()}`,
    );

    const sub = await this.prisma.admin.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = this.toPlan(sub.plan);

    await this.meteringEngine.finalizePeriod(sub.tenantId, periodStart);

    const meters = await this.getFinalizedUsage(sub.tenantId, periodStart, periodEnd);

    const strategy = this.pricingStrategyFactory.getStrategy(plan.pricingModel);
    const lines = await strategy.calculate(plan, meters);

    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
    const dueDate = new Date(periodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await this.prisma.admin.invoice.create({
      data: {
        subscriptionId,
        tenantId: sub.tenantId,
        status: 'unpaid',
        periodStart,
        periodEnd,
        lines: lines as any,
        subtotal,
        total: subtotal,
        dueDate,
      },
    });

    this.logger.log(
      `Invoice created: id=${invoice.id} tenant=${sub.tenantId} total=${subtotal}`,
    );

    return this.toInvoice(invoice);
  }

  async finalizeInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.admin.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'unpaid') {
      throw new BadRequestException(
        `Cannot finalize invoice with status: ${invoice.status}`,
      );
    }

    const updated = await this.prisma.admin.invoice.update({
      where: { id: invoiceId },
      data: { status: 'finalized' },
    });

    this.logger.log(`Invoice finalized: id=${invoiceId}`);

    return this.toInvoice(updated);
  }

  async markPaid(
    invoiceId: string,
    stripeInvoiceId?: string,
  ): Promise<Invoice> {
    const invoice = await this.prisma.admin.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.admin.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        stripeInvoiceId,
      },
    });

    this.logger.log(`Invoice marked paid: id=${invoiceId}`);

    return this.toInvoice(updated);
  }

  async markFailed(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.admin.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.admin.invoice.update({
      where: { id: invoiceId },
      data: { status: 'failed' },
    });

    this.logger.log(`Invoice marked failed: id=${invoiceId}`);

    return this.toInvoice(updated);
  }

  async voidInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.admin.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.admin.invoice.update({
      where: { id: invoiceId },
      data: { status: 'void' },
    });

    this.logger.log(`Invoice voided: id=${invoiceId}`);

    return this.toInvoice(updated);
  }

  async listInvoices(
    tenantId: string,
    status?: InvoiceStatus,
    page = 1,
    perPage = 20,
  ): Promise<PaginatedInvoices> {
    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.admin.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.admin.invoice.count({ where }),
    ]);

    return {
      data: data.map((r: any) => this.toInvoice(r)),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.admin.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.toInvoice(invoice);
  }

  private async getFinalizedUsage(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<UsageMeter[]> {
    const records = await this.prisma.admin.usageMeter.findMany({
      where: {
        tenantId,
        periodStart: { gte: periodStart, lte: periodEnd },
        isFinalized: true,
      },
    });

    return records.map((r: any) => ({
      id: r.id,
      tenantId: r.tenantId,
      metric: r.metric,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
      value: r.value,
      overage: 0,
      isFinalized: r.isFinalized,
    }));
  }

  private toPlan(row: any): Plan {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      currency: row.currency,
      billingPeriod: row.billingPeriod as 'monthly' | 'yearly',
      pricingModel: row.pricingModel,
      limits: row.limits as any[],
      features: row.features,
      trialDays: row.trialDays,
      active: row.active,
    };
  }

  private toInvoice(row: any): Invoice {
    return {
      id: row.id,
      subscriptionId: row.subscriptionId,
      tenantId: row.tenantId,
      status: row.status as InvoiceStatus,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      lines: row.lines as InvoiceLine[],
      subtotal: row.subtotal,
      total: row.total,
      stripeInvoiceId: row.stripeInvoiceId ?? undefined,
      paidAt: row.paidAt?.toISOString(),
      dueDate: row.dueDate.toISOString(),
    };
  }
}
