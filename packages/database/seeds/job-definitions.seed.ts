import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedJobDefinition {
  key: string;
  name: string;
  maxRetries: number;
  timeout: number;
}

const SEED_JOB_DEFINITIONS: SeedJobDefinition[] = [
  {
    key: 'activity-timeline:ingestion',
    name: 'Activity Timeline Ingestion',
    maxRetries: 3,
    timeout: 30000,
  },
  {
    key: 'kb:ingestion',
    name: 'Knowledge Base Ingestion',
    maxRetries: 3,
    timeout: 60000,
  },
  {
    key: 'kb:reindex',
    name: 'Knowledge Base Reindex',
    maxRetries: 2,
    timeout: 120000,
  },
  {
    key: 'audit:ingestion',
    name: 'Audit Log Ingestion',
    maxRetries: 3,
    timeout: 30000,
  },
  {
    key: 'billing:metering',
    name: 'Usage Metering Collection',
    maxRetries: 2,
    timeout: 60000,
  },
  {
    key: 'billing:invoice',
    name: 'Invoice Generation',
    maxRetries: 3,
    timeout: 120000,
  },
  {
    key: 'billing:stripe-webhooks',
    name: 'Stripe Webhook Processing',
    maxRetries: 3,
    timeout: 30000,
  },
  {
    key: 'reporting:dataset:ingestion',
    name: 'Report Dataset Ingestion',
    maxRetries: 3,
    timeout: 60000,
  },
];

async function main() {
  console.log('Seeding job definitions...');

  for (const def of SEED_JOB_DEFINITIONS) {
    // JobDefinitions are per-tenant, but for seed we create a system-wide
    // reference definition with a sentinel tenant ID. Actual per-tenant
    // records are created on first enqueue() call.
    await prisma.jobDefinition.upsert({
      where: {
        tenantId_key: {
          tenantId: '__system__',
          key: def.key,
        },
      },
      update: {
        name: def.name,
        maxRetries: def.maxRetries,
        timeout: def.timeout,
        active: true,
      },
      create: {
        tenantId: '__system__',
        key: def.key,
        name: def.name,
        maxRetries: def.maxRetries,
        timeout: def.timeout,
        retryDelay: 5000,
        concurrency: 1,
        active: true,
      },
    });
    console.log(`  ✓ ${def.key} (${def.name})`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
