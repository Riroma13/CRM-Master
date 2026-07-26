import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: 'admin',
    permissions: ['*:admin'],
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'manager',
    permissions: ['workflows:*', 'documents:*', 'notifications:*', 'users:read', 'teams:*'],
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'member',
    permissions: ['workflows:read', 'documents:read', 'notifications:read'],
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'viewer',
    permissions: ['workflows:read', 'documents:read'],
    isDefault: false,
    isSystem: true,
  },
];

async function main() {
  console.log('Seeding identity roles...');

  const tenants = await prisma.tenant.findMany();

  if (tenants.length === 0) {
    console.log('  No tenants found. Skipping role seeding.');
    return;
  }

  for (const tenant of tenants) {
    for (const role of DEFAULT_ROLES) {
      await prisma.role.upsert({
        where: { tenantId_name: { tenantId: tenant.id, name: role.name } },
        update: role,
        create: { ...role, tenantId: tenant.id },
      });
    }
    console.log(`  ✓ ${tenant.slug} — ${DEFAULT_ROLES.length} roles seeded`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
