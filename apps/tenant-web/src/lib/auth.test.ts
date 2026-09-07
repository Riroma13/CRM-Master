import { describe, expect, it } from 'vitest';
import { getGoogleLoginUrl, login, logout } from './auth';

import { vi } from 'vitest';

describe('getGoogleLoginUrl', () => {
  it('creates an admin-only Better Auth initiation URL without credentials', () => {
    expect(getGoogleLoginUrl()).toBe(
      '/api/auth/sign-in/social?provider=google&callbackURL=%2Fadmin',
    );
  });

  it('allows the bounded login return path without exposing provider secrets', () => {
    expect(getGoogleLoginUrl('/login')).toBe(
      '/api/auth/sign-in/social?provider=google&callbackURL=%2Flogin',
    );
  });
});

describe('cookie-only tenant-admin auth', () => {
  it('does not persist the session credential or user in browser storage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: vi.fn().mockResolvedValue({
        user: { id: 'user-a', email: 'a@example.test', name: 'A', role: 'admin' },
        tenant: { id: 'tenant-a', slug: 'tenant-a', name: 'Tenant A' },
      }),
    }));

    await login('a@example.test', 'correct-password');

    expect(sessionStorage.getItem('crm_session_token')).toBeNull();
    expect(localStorage.getItem('crm_session_token')).toBeNull();
    expect(sessionStorage.getItem('crm_user')).toBeNull();
  });

  it('uses the cookie contract for logout without storing a credential', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }));
    await logout();
    expect(sessionStorage.getItem('crm_session_token')).toBeNull();
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].credentials).toBe('include');
  });
});
