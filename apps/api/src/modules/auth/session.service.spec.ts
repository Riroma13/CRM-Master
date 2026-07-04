import { SessionService, SessionData } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('createSession', () => {
    it('should return a token string', () => {
      const token = service.createSession({
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^sess_/);
    });

    it('should generate unique tokens on each call', () => {
      const token1 = service.createSession({
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
      });

      const token2 = service.createSession({
        userId: 'user-2',
        email: 'user@test.com',
        name: 'User',
        tenantId: 'tenant-2',
        role: 'user',
      });

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateSession', () => {
    it('should return session data for a valid token', () => {
      const token = service.createSession({
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
      });

      const session = service.validateSession(token);

      expect(session).not.toBeNull();
      expect(session!.userId).toBe('user-1');
      expect(session!.email).toBe('admin@test.com');
      expect(session!.name).toBe('Admin');
      expect(session!.tenantId).toBe('tenant-1');
      expect(session!.role).toBe('superadmin');
      expect(session!.expiresAt).toBeInstanceOf(Date);
    });

    it('should return null for an unknown token', () => {
      const session = service.validateSession('sess_nonexistent');
      expect(session).toBeNull();
    });

    it('should return null for an expired session', () => {
      const token = service.createSession({
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
      });

      // Advance time past the 7-day expiry
      jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);

      const session = service.validateSession(token);
      expect(session).toBeNull();
    });
  });

  describe('destroySession', () => {
    it('should remove the session so validateSession returns null', () => {
      const token = service.createSession({
        userId: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        tenantId: 'tenant-1',
        role: 'superadmin',
      });

      service.destroySession(token);

      const session = service.validateSession(token);
      expect(session).toBeNull();
    });

    it('should not throw when destroying a nonexistent token', () => {
      expect(() => service.destroySession('sess_nonexistent')).not.toThrow();
    });
  });
});
