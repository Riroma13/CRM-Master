import { OAuthProvider } from '../oauth-provider';

describe('OAuthProvider', () => {
  const provider = new OAuthProvider();
  const config = { authUrl: 'https://auth.test/oauth', clientId: 'c1', redirectUri: 'https://app.test/callback', scopes: ['read'] };

  it('should generate auth URL with state parameter', () => {
    const result = provider.getAuthUrl(config);
    expect(result.url).toContain('state=');
    expect(result.state).toBeTruthy();
    expect(result.state.length).toBeGreaterThan(10);
  });

  it('should validate matching state', () => {
    const state = 'abc123';
    expect(provider.validateState(state, state)).toBe(true);
  });

  it('should reject invalid state', () => {
    expect(provider.validateState('valid12345', 'invalid67890')).toBe(false);
  });

  it('should reject empty state', () => {
    expect(provider.validateState('', '')).toBe(false);
  });
});
