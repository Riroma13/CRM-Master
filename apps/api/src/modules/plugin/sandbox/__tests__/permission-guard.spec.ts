import { PermissionGuard, PermissionDeniedError } from '../permission-guard';

describe('PermissionGuard', () => {
  describe('with allowed permissions', () => {
    const guard = new PermissionGuard(['storage:read', 'http:outbound']);

    it('allows a permitted action', () => {
      expect(() => guard.require('storage:read')).not.toThrow();
    });

    it('returns true for check on permitted permission', () => {
      expect(guard.check('storage:read')).toBe(true);
    });

    it('throws for denied permission', () => {
      expect(() => guard.require('storage:write')).toThrow(PermissionDeniedError);
      expect(() => guard.require('storage:write')).toThrow('Permission denied: storage:write');
    });

    it('returns false for check on denied permission', () => {
      expect(guard.check('storage:write')).toBe(false);
    });
  });

  describe('with no permissions', () => {
    const guard = new PermissionGuard([]);

    it('denies every action', () => {
      expect(() => guard.require('storage:read')).toThrow(PermissionDeniedError);
      expect(() => guard.require('storage:write')).toThrow(PermissionDeniedError);
      expect(() => guard.require('http:outbound')).toThrow(PermissionDeniedError);
      expect(() => guard.require('events:emit')).toThrow(PermissionDeniedError);
    });

    it('check returns false for all', () => {
      expect(guard.check('storage:read')).toBe(false);
      expect(guard.check('events:emit')).toBe(false);
    });
  });

  describe('with all permissions', () => {
    const guard = new PermissionGuard([
      'storage:read',
      'storage:write',
      'http:outbound',
      'events:emit',
    ]);

    it('allows all', () => {
      expect(() => guard.require('storage:read')).not.toThrow();
      expect(() => guard.require('storage:write')).not.toThrow();
      expect(() => guard.require('http:outbound')).not.toThrow();
      expect(() => guard.require('events:emit')).not.toThrow();
    });
  });

  it('PermissionDeniedError has correct name', () => {
    const error = new PermissionDeniedError('storage:read');
    expect(error.name).toBe('PermissionDeniedError');
    expect(error.message).toBe('Permission denied: storage:read');
  });
});
