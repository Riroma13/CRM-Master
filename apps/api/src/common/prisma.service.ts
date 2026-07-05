import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createPrismaClient, ScopedPrismaClient } from '../../../../packages/database/src';

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

  /** Cliente sin scope (superadmin) */
  get admin() {
    return this.client;
  }

  get $client() {
    return this.client;
  }
}
