import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PLANS = [
  {
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    currency: 'usd',
    billingPeriod: 'monthly',
    pricingModel: 'flat',
    limits: [
      { metric: 'workflows', limit: 10, type: 'hard' },
      { metric: 'documents', limit: 50, type: 'hard' },
      { metric: 'api_calls', limit: 100, overagePrice: 0, type: 'hard', warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'plugins', limit: 1, type: 'hard' },
    ],
    features: ['workflows', 'documents', 'api-access', 'basic-analytics'],
    trialDays: 0,
    active: true,
  },
  {
    name: 'Basic',
    description: 'For growing businesses',
    price: 2900,
    currency: 'usd',
    billingPeriod: 'monthly',
    pricingModel: 'flat',
    limits: [
      { metric: 'workflows', limit: 100, type: 'hard' },
      { metric: 'documents', limit: 500, type: 'soft', overagePrice: 5, warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'api_calls', limit: 1000, overagePrice: 1, type: 'hard', warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'plugins', limit: 5, type: 'hard' },
    ],
    features: ['workflows', 'documents', 'api-access', 'advanced-analytics', 'email-notifications', 'custom-branding'],
    trialDays: 14,
    active: true,
  },
  {
    name: 'Pro',
    description: 'For professional teams',
    price: 9900,
    currency: 'usd',
    billingPeriod: 'monthly',
    pricingModel: 'flat',
    limits: [
      { metric: 'workflows', limit: 1000, type: 'hard' },
      { metric: 'documents', limit: 5000, type: 'soft', overagePrice: 3, warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'api_calls', limit: 10000, overagePrice: 0.5, type: 'soft', warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'plugins', limit: 20, type: 'hard' },
    ],
    features: [
      'workflows', 'documents', 'api-access', 'advanced-analytics', 'email-notifications',
      'custom-branding', 'priority-support', 'audit-logs', 'automation-hub',
    ],
    trialDays: 14,
    active: true,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price: 29900,
    currency: 'usd',
    billingPeriod: 'monthly',
    pricingModel: 'flat',
    limits: [
      { metric: 'workflows', limit: 0, type: 'hard' },
      { metric: 'documents', limit: 0, type: 'soft', overagePrice: 1, warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'api_calls', limit: 0, type: 'soft', warningThresholds: [0.8, 0.9, 1.0] },
      { metric: 'plugins', limit: 0, type: 'hard' },
    ],
    features: [
      'workflows', 'documents', 'api-access', 'advanced-analytics', 'email-notifications',
      'custom-branding', 'priority-support', 'audit-logs', 'automation-hub',
      'dedicated-infrastructure', 'sla-guarantee', 'custom-integrations', 'onboarding-training',
    ],
    trialDays: 14,
    active: true,
  },
];

async function main() {
  console.log('Seeding billing plans...');

  for (const plan of SEED_PLANS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`  ✓ ${plan.name}`);
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
