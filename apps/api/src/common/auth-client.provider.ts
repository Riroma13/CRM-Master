import { Provider, FactoryProvider } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { createAuth, Auth, getSessionCookieConfig } from './auth';
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
  constructor(
    private readonly auth: Auth,
    private readonly prisma?: PrismaService,
  ) {}

  async getSession(headers: Pick<Headers, 'get'>): Promise<ProviderSession | null> {
    try {
      const session = await (this.auth.api as any).getSession({ headers: providerHeaders(headers) });
      if (session?.user && session.session) {
        return {
          userId: session.user.id,
          activeOrganizationId: session.session.activeOrganizationId ?? null,
        };
      }

      const token = this.opaqueSessionToken(headers.get('cookie'));
      if (!token || !this.prisma) return null;

      const opaqueSession = await this.prisma.admin.session.findFirst({
        where: { token, expiresAt: { gt: new Date() } },
      });
      if (!opaqueSession) return null;

      return {
        userId: opaqueSession.userId,
        activeOrganizationId: opaqueSession.activeOrganizationId ?? null,
      };
    } catch {
      return null;
    }
  }

  private opaqueSessionToken(cookieHeader: string | null): string | null {
    const cookieName = getSessionCookieConfig().name;
    const cookie = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`));
    if (!cookie) return null;

    const token = cookie.slice(cookieName.length + 1);
    return token || null;
  }
}

export const authClientProvider: FactoryProvider = {
  provide: AUTH_CLIENT,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService): IdentityProvider => {
    return new BetterAuthProviderSessionAdapter(createAuth(prisma.$client), prisma);
  },
};
