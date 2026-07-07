import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, organization } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      bearer(),
      organization({
        allowUserToCreateOrganization: false,
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
