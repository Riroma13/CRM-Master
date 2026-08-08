import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createPrismaClient, ScopedPrismaClient } from '../../../../packages/database/src';
import { createReportingReadOnlyExtension } from '../modules/reporting/reporting-read-only.middleware';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private client: ScopedPrismaClient;

  constructor() {
    this.client = createPrismaClient();
    // createPrismaClient() emits a warning when called without tenantId
    // in non-test environments (see packages/database/src/index.ts)
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
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
    return createPrismaClient(tenantId).$extends(createReportingReadOnlyExtension()) as any;
  }

  /** Cliente sin scope (superadmin) */
  get admin() {
    return this.client;
  }

  /** Unscoped reporting client for trusted reporting operations. */
  get reportingAdmin() {
    return this.client.$extends(createReportingReadOnlyExtension()) as any;
  }

  get $client() {
    return this.client;
  }
}
