/**
 * Backfill script: Creates Better-Auth organizations and users from existing
 * Tenant and User records.
 *
 * Idempotent — safe to run multiple times. Skips records that already have
 * betterAuthUserId / betterAuthOrganizationId set.
 *
 * Usage: npx tsx scripts/backfill-better-auth.ts
 */
import { PrismaClient } from '@prisma/client';
import { createAuth } from '../src/common/auth';

const prisma = new PrismaClient();

async function main() {
  const auth = createAuth(prisma);
  console.log('[backfill] Starting Better-Auth backfill...');

  // ─── Step 1: Create organizations from Tenants ──────────────
  const tenants = await prisma.tenant.findMany({
    where: { betterAuthOrganizationId: null },
  });
  console.log(`[backfill] Found ${tenants.length} tenants without organization.`);

  for (const tenant of tenants) {
    try {
      const org = await auth.api.createOrganization({
        body: {
          name: tenant.name,
          slug: tenant.slug,
        },
      });
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { betterAuthOrganizationId: org.id },
      });
      console.log(`[backfill] Created organization "${tenant.slug}" → ${org.id}`);
    } catch (e: any) {
      console.error(`[backfill] Failed to create org for tenant ${tenant.slug}: ${e.message}`);
    }
  }

  // ─── Step 2: Create users + memberships ─────────────────────
  const users = await prisma.user.findMany({
    where: { betterAuthUserId: null },
    include: { tenant: true },
  });
  console.log(`[backfill] Found ${users.length} users without Better-Auth link.`);

  for (const user of users) {
    if (!user.tenant.betterAuthOrganizationId) {
      console.warn(`[backfill] Skipping user ${user.email}: tenant has no organization.`);
      continue;
    }

    try {
      const baUser = await auth.api.signUpEmail({
        body: {
          email: user.email,
          name: user.name || user.email,
          password: crypto.randomUUID(), // random password — user must reset
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { betterAuthUserId: baUser.user.id },
      });

      // If not superadmin, add as member of the organization
      if (user.role !== 'superadmin') {
        await auth.api.addMember({
          body: {
            organizationId: user.tenant.betterAuthOrganizationId,
            userId: baUser.user.id,
            role: 'admin',
          },
        });
      }

      console.log(`[backfill] Created user "${user.email}" → ${baUser.user.id}${user.role === 'superadmin' ? ' (org-less)' : ''}`);
    } catch (e: any) {
      console.error(`[backfill] Failed to create user ${user.email}: ${e.message}`);
    }
  }

  console.log('[backfill] Done.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('[backfill] Fatal:', e);
  process.exit(1);
});
