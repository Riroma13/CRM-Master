import { describe, expect, it } from 'vitest';
import { getGoogleLoginUrl } from './auth';

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
