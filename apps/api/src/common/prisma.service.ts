import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient, ScopedPrismaClient } from '../../../../packages/database/src';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: ScopedPrismaClient;

  constructor() {
    this.client = createPrismaClient();
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  /** Obtener cliente scopeado por tenant */
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
