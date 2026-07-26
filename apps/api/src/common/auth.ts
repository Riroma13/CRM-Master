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
    user: {
      modelName: 'ba_users',
    },
    session: {
      modelName: 'ba_sessions',
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    account: {
      modelName: 'ba_accounts',
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
      },
    },
    verification: {
      modelName: 'ba_verifications',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      bearer(),
      organization({
        allowUserToCreateOrganization: false,
        schema: {
          session: {
            fields: {
              activeOrganizationId: 'active_organization_id',
            },
          },
          organization: {
            modelName: 'ba_organizations',
          },
          member: {
            modelName: 'ba_members',
            fields: {
              organizationId: 'organization_id',
              userId: 'user_id',
            },
          },
          invitation: {
            modelName: 'ba_invitations',
            fields: {
              organizationId: 'organization_id',
              inviterId: 'inviter_id',
              expiresAt: 'expires_at',
            },
          },
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
