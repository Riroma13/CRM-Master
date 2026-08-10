import { Provider, FactoryProvider } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { createAuth, Auth } from './auth';
import { IdentityProvider, ProviderSession } from '../modules/identity/identity.contracts';

export const AUTH_CLIENT = 'AUTH_CLIENT';

export function providerHeaders(headers: Pick<Headers, 'get'>): Headers {
  const forwarded = new Headers();
  for (const name of ['authorization', 'cookie']) {
    const value = headers.get(name);
    if (value) forwarded.set(name, value);
  }
  return forwarded;
}

export class BetterAuthProviderSessionAdapter implements IdentityProvider {
  constructor(private readonly auth: Auth) {}

  async getSession(headers: Pick<Headers, 'get'>): Promise<ProviderSession | null> {
    try {
      const session = await (this.auth.api as any).getSession({ headers: providerHeaders(headers) });
      if (!session?.user || !session.session) return null;
      return {
        userId: session.user.id,
        activeOrganizationId: session.session.activeOrganizationId ?? null,
      };
    } catch {
      return null;
    }
  }
}

export const authClientProvider: FactoryProvider = {
  provide: AUTH_CLIENT,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService): IdentityProvider => {
    return new BetterAuthProviderSessionAdapter(createAuth(prisma.$client));
  },
};
