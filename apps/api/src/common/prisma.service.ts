import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createPrismaClient, ScopedPrismaClient } from '../../../../packages/database/src';
import { createReportingReadOnlyExtension } from '../modules/reporting/reporting-read-only.middleware';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly baseClient: ScopedPrismaClient;

  constructor() {
    this.baseClient = createPrismaClient();
    // createPrismaClient() emits a warning when called without tenantId
    // in non-test environments (see packages/database/src/index.ts)
  }

  async onModuleInit() {
    await this.baseClient.$connect();
  }

  async onModuleDestroy() {
    await this.baseClient.$disconnect();
  }

  /**
   * Creates a tenant-scoped Prisma client for the given tenant.
   * All queries on the returned client are automatically filtered by tenantId.
   * Raw SQL methods ($queryRaw, $queryRawUnsafe, $executeRaw) are blocked.
   */
  forTenant(tenantId: string) {
    return createPrismaClient(tenantId);
  }

  /** Creates a tenant-scoped client restricted to reporting models. */
  forReporting(tenantId: string) {
    return this.forTenant(tenantId).$extends(createReportingReadOnlyExtension()) as any;
  }

  /** Cliente sin scope (superadmin) */
  get admin() {
    return this.baseClient;
  }

  /** Unscoped reporting client for trusted reporting operations. */
  get reportingAdmin() {
    return this.baseClient.$extends(createReportingReadOnlyExtension()) as any;
  }

  get $client() {
    return this.baseClient;
  }
}
