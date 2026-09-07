import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, organization } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

const DEFAULT_RETURN_PATHS = ['/admin', '/login'] as const;

export type OAuthConfig = {
  enabled: boolean;
  socialProviders: Record<string, unknown>;
  trustedOrigins: string[];
  returnOrigins: string[];
  returnPaths: readonly ['/admin', '/login'];
};

export type SessionCookieConfig = {
  name: '__Secure-better-auth.session_token' | 'better-auth.session_token';
  attributes: {
    domain?: '.crmmaster.com';
    path: '/';
    httpOnly: true;
    sameSite: 'lax';
    secure: boolean;
  };
};

export type AuthCookieTransport = 'http' | 'https';

export function resolveAuthCookieTransport(value = process.env.AUTH_COOKIE_TRANSPORT): AuthCookieTransport {
  return value === 'http' || value === 'https' ? value : 'https';
}

export function getSessionCookieConfig(transport?: string): SessionCookieConfig {
  if (resolveAuthCookieTransport(transport) === 'https') {
    return {
      name: '__Secure-better-auth.session_token',
      attributes: {
        domain: '.crmmaster.com',
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      },
    };
  }

  return {
    name: 'better-auth.session_token',
    attributes: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  };
}

function exactOrigins(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => {
      if (!origin || origin === '*' || origin.includes('*')) return false;
      try {
        const parsed = new URL(origin);
        return parsed.origin === origin && ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    });
}

export function createOAuthConfig(): OAuthConfig {
  const trustedOrigins = exactOrigins(process.env.OAUTH_TRUSTED_ORIGINS);
  const returnOrigins = exactOrigins(process.env.OAUTH_RETURN_ORIGINS);
  const enabled =
    process.env.OAUTH_SOCIAL_LOGIN_ENABLED === 'true' &&
    Boolean(process.env.BETTER_AUTH_SECRET) &&
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
    trustedOrigins.length > 0 &&
    trustedOrigins.length === returnOrigins.length &&
    trustedOrigins.every(origin => returnOrigins.includes(origin));

  if (!enabled) {
    return {
      enabled: false,
      socialProviders: {},
      trustedOrigins: [],
      returnOrigins: [],
      returnPaths: DEFAULT_RETURN_PATHS,
    };
  }

  return {
    enabled: true,
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        disableImplicitSignUp: true,
        disableImplicitLinking: true,
      },
    },
    trustedOrigins,
    returnOrigins,
    returnPaths: DEFAULT_RETURN_PATHS,
  };
}

export function createCorsOptions() {
  const oauth = createOAuthConfig();
  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const allowlist = oauth.enabled
    ? oauth.trustedOrigins
    : [...new Set(configured.filter(origin => origin !== '*'))];

  return { origin: allowlist, credentials: true };
}

function callbackOrigin(context: { headers?: Headers; request?: Request }): string | null {
  const origin = context.headers?.get('origin') ?? context.request?.headers.get('origin');
  return origin && origin !== '*' ? origin : null;
}

function isCallbackPath(path: unknown): path is `/callback/${string}` {
  return typeof path === 'string' && /^\/callback\/[^/]+$/.test(path);
}

function isSupportedAccountLifecycle(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const account = data as { providerId?: unknown; accountId?: unknown; userId?: unknown };
  return (
    typeof account.providerId === 'string' &&
    ['credential', 'google'].includes(account.providerId) &&
    typeof account.accountId === 'string' &&
    account.accountId.length > 0 &&
    typeof account.userId === 'string' &&
    account.userId.length > 0
  );
}

function isSupportedSessionLifecycle(data: unknown, context: unknown): boolean {
  if (!data || typeof data !== 'object' || !context || typeof context !== 'object') return false;
  const session = data as { id?: unknown; userId?: unknown };
  const authContext = context as { path?: unknown };
  return (
    typeof authContext.path === 'string' &&
    typeof session.id === 'string' &&
    session.id.length > 0 &&
    typeof session.userId === 'string' &&
    session.userId.length > 0
  );
}

export function createAuth(prisma: PrismaClient) {
  const oauth = createOAuthConfig();
  const sessionCookie = getSessionCookieConfig();

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: oauth.trustedOrigins,
    advanced: {
      cookies: {
        session_token: {
          ...sessionCookie,
        },
      },
    },
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: oauth.socialProviders as any,
    hooks: {
      before: async (context: { path?: unknown; headers?: Headers; request?: Request }) => {
        if (!isCallbackPath(context.path)) return;
        if (!callbackOrigin(context) || !oauth.returnOrigins.includes(callbackOrigin(context) as string)) {
          throw new Error('OAuth callback origin rejected');
        }
      },
    },
    databaseHooks: {
      account: {
        create: {
          before: async (data: unknown) => (isSupportedAccountLifecycle(data) ? undefined : false),
        },
      },
      session: {
        create: {
          before: async (data: unknown, context: unknown) => (
            isSupportedSessionLifecycle(data, context) ? undefined : false
          ),
        },
      },
    },
    account: {
      accountLinking: {
        disableImplicitLinking: true,
        allowDifferentEmails: false,
        requireLocalEmailVerified: true,
      },
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
