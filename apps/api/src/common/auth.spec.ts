import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

jest.mock('better-auth', () => ({
  betterAuth: jest.fn((options: unknown) => ({ options })),
}));
jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(() => ({ type: 'prisma-adapter' })),
}));
jest.mock('better-auth/plugins', () => ({
  bearer: jest.fn(() => ({ id: 'bearer' })),
  organization: jest.fn(() => ({ id: 'organization' })),
}));

import { createAuth, createCorsOptions, createOAuthConfig } from './auth';

describe('OAuth social login foundation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function enableOAuth() {
    process.env.OAUTH_SOCIAL_LOGIN_ENABLED = 'true';
    process.env.BETTER_AUTH_SECRET = 'test-secret-with-more-than-32-characters';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.OAUTH_TRUSTED_ORIGINS = 'https://alpha.crmmaster.com,https://beta.crmmaster.com';
    process.env.OAUTH_RETURN_ORIGINS = 'https://alpha.crmmaster.com,https://beta.crmmaster.com';
  }

  it('fails closed and exposes no provider when OAuth configuration is incomplete', () => {
    delete process.env.OAUTH_SOCIAL_LOGIN_ENABLED;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.BETTER_AUTH_SECRET;

    const config = createOAuthConfig();

    expect(config.enabled).toBe(false);
    expect(config.socialProviders).toEqual({});
    expect(config.trustedOrigins).toEqual([]);
    expect(config.returnPaths).toEqual(['/admin', '/login']);
  });

  it('accepts only an exact, credentialed trusted-origin and return-origin allowlist', () => {
    enableOAuth();

    const config = createOAuthConfig();

    expect(config.enabled).toBe(true);
    expect(config.socialProviders.google).toMatchObject({
      disableImplicitSignUp: true,
      disableImplicitLinking: true,
    });
    expect(config.trustedOrigins).toEqual([
      'https://alpha.crmmaster.com',
      'https://beta.crmmaster.com',
    ]);
    expect(config.returnOrigins).toEqual(config.trustedOrigins);
    expect(config.returnPaths).toEqual(['/admin', '/login']);
    expect(config.trustedOrigins).not.toContain('*');
  });

  it('configures account linking to require verified local email and reject different emails', () => {
    enableOAuth();

    const options = (createAuth({} as never) as any).options;

    expect(options.account.accountLinking).toMatchObject({
      disableImplicitLinking: true,
      allowDifferentEmails: false,
      requireLocalEmailVerified: true,
    });
  });

  it('builds a credentialed CORS runtime allowlist without wildcard access', () => {
    process.env.CORS_ORIGIN = 'https://alpha.crmmaster.com,*,https://foreign.example';
    enableOAuth();

    expect(createCorsOptions()).toEqual({
      origin: ['https://alpha.crmmaster.com', 'https://beta.crmmaster.com'],
      credentials: true,
    });
  });

  it.each([
    ['foreign origin', 'https://foreign.example'],
    ['missing origin', null],
    ['wildcard origin', '*'],
  ])('rejects callback with %s before Better Auth parses state', async (_label, origin) => {
    enableOAuth();
    const before = (createAuth({} as never) as any).options.hooks.before;
    const headers = new Headers(origin === null ? undefined : { origin });

    await expect(before({ path: '/callback/google', headers })).rejects.toThrow('OAuth callback origin rejected');
  });

  it('admits an exact configured callback origin without reading OAuth state', async () => {
    enableOAuth();
    const before = (createAuth({} as never) as any).options.hooks.before;

    await expect(before({
      path: '/callback/google',
      headers: new Headers({ origin: 'https://alpha.crmmaster.com' }),
      query: { state: 'opaque-state-that-is-not-read' },
    })).resolves.toBeUndefined();
  });

  it('rejects unsupported account and session lifecycle writes without admitting a write', async () => {
    enableOAuth();
    const options = (createAuth({} as never) as any).options;

    await expect(options.databaseHooks.account.create.before(
      { providerId: 'github', accountId: 'github-account', userId: 'user-1' },
      { path: '/callback/github' },
    )).resolves.toBe(false);
    await expect(options.databaseHooks.session.create.before(
      { id: 'session-1', userId: '' },
      { path: '/callback/google' },
    )).resolves.toBe(false);
  });

  it('preserves supported credential and explicit Google lifecycle data', async () => {
    enableOAuth();
    const options = (createAuth({} as never) as any).options;

    await expect(options.databaseHooks.account.create.before(
      { providerId: 'credential', accountId: 'user-1', userId: 'user-1' },
      { path: '/sign-in/email' },
    )).resolves.toBeUndefined();
    await expect(options.databaseHooks.account.create.before(
      { providerId: 'google', accountId: 'google-1', userId: 'user-1' },
      { path: '/callback/google' },
    )).resolves.toBeUndefined();
    await expect(options.databaseHooks.session.create.before(
      { id: 'session-1', userId: 'user-1' },
      { path: '/callback/google' },
    )).resolves.toBeUndefined();
  });

  it('preserves the canonical Better Auth mount contract without callback wiring', () => {
    const main = readFileSync(resolve(__dirname, '../main.ts'), 'utf8');
    expect(main.match(/app\.use\('\/api\/auth', toNodeHandler\(auth\)\);/g)).toEqual([
      "app.use('/api/auth', toNodeHandler(auth));",
    ]);
    expect(main).not.toContain('validateOAuthCallback');
    expect(main).not.toContain('linkOAuthAccount');
  });

  it('proves Better Auth schema fields are present without requiring a migration', () => {
    const schema = readFileSync(resolve(__dirname, '../../../../packages/database/prisma/schema.prisma'), 'utf8');

    expect(schema).toContain('model user');
    expect(schema).toContain('model account');
    expect(schema).toContain('model session');
    expect(schema).toContain('emailVerified Boolean');
    expect(schema).toContain('providerId');
    expect(schema).toContain('activeOrganizationId');
    expect(schema).toContain('model LegacyUser');
  });

  it('keeps the Better Auth instance disabled unless the compatibility gate is satisfied', () => {
    delete process.env.OAUTH_SOCIAL_LOGIN_ENABLED;
    const auth = createAuth({} as never) as any;

    expect(auth.options.socialProviders).toEqual({});
  });

  it('configures the documented opaque Better Auth session cookie for cross-subdomain transport', () => {
    delete process.env.NODE_ENV;
    const auth = createAuth({} as never) as any;

    expect(auth.options.advanced.cookies.session_token).toEqual({
      name: '__Secure-better-auth.session_token',
      attributes: {
        domain: '.crmmaster.com',
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      },
    });
  });
});
