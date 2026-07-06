import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: false,
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
