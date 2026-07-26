import { describe, it, expect } from 'vitest';
import type { UserProfile, Team, Membership, Role, InvitationStatus, Invitation } from '../identity.types';
import type { PermissionResource, PermissionAction, PermissionString, PermissionCheck, PermissionResult } from '../permission.types';
import type { PasswordPolicy, SecurityPolicy } from '../security.types';

describe('Identity types compile correctly', () => {
  it('UserProfile accepts valid shape', () => {
    const profile: UserProfile = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'John Doe',
      active: true,
    };
    expect(profile.email).toBe('user@example.com');
  });

  it('UserProfile with optional fields', () => {
    const profile: UserProfile = {
      id: 'user-2',
      email: 'jane@example.com',
      name: 'Jane Doe',
      avatar: 'https://example.com/avatar.jpg',
      timezone: 'Europe/Madrid',
      language: 'es',
      active: false,
    };
    expect(profile.avatar).toBeDefined();
  });

  it('Team accepts valid shape', () => {
    const team: Team = {
      id: 'team-1',
      tenantId: 'tenant-1',
      name: 'Engineering',
      depth: 0,
      memberCount: 5,
    };
    expect(team.depth).toBe(0);
    expect(team.memberCount).toBe(5);
  });

  it('Team with parent and description', () => {
    const team: Team = {
      id: 'team-2',
      tenantId: 'tenant-1',
      name: 'Frontend',
      description: 'Frontend team under Engineering',
      parentTeamId: 'team-1',
      depth: 1,
      memberCount: 3,
    };
    expect(team.parentTeamId).toBe('team-1');
    expect(team.depth).toBe(1);
  });

  it('Membership accepts valid shape', () => {
    const membership: Membership = {
      userId: 'user-1',
      teamId: 'team-1',
      roleId: 'role-1',
    };
    expect(membership.userId).toBe('user-1');
  });

  it('Role accepts valid shape', () => {
    const role: Role = {
      id: 'role-1',
      tenantId: 'tenant-1',
      name: 'admin',
      permissions: ['*:admin'],
      isDefault: false,
      isSystem: true,
    };
    expect(role.permissions).toContain('*:admin');
  });

  it('Role with description', () => {
    const role: Role = {
      id: 'role-2',
      tenantId: 'tenant-1',
      name: 'manager',
      description: 'Manages workflows and documents',
      permissions: ['workflows:*', 'documents:*'],
      isDefault: true,
      isSystem: false,
    };
    expect(role.description).toBeDefined();
  });

  it('InvitationStatus accepts all valid values', () => {
    const statuses: InvitationStatus[] = ['pending', 'accepted', 'expired', 'cancelled'];
    expect(statuses).toHaveLength(4);
  });

  it('Invitation accepts valid shape', () => {
    const invitation: Invitation = {
      id: 'inv-1',
      tenantId: 'tenant-1',
      email: 'newuser@example.com',
      roleId: 'role-1',
      tokenHash: 'a1b2c3...',
      status: 'pending',
      expiresAt: '2026-08-01T00:00:00.000Z',
    };
    expect(invitation.status).toBe('pending');
  });

  it('Invitation with accepted fields', () => {
    const invitation: Invitation = {
      id: 'inv-2',
      tenantId: 'tenant-1',
      email: 'member@example.com',
      roleId: 'role-2',
      teamId: 'team-1',
      tokenHash: 'd4e5f6...',
      status: 'accepted',
      expiresAt: '2026-08-01T00:00:00.000Z',
      acceptedAt: '2026-07-21T12:00:00.000Z',
    };
    expect(invitation.teamId).toBe('team-1');
    expect(invitation.acceptedAt).toBeDefined();
  });
});

describe('Permission types compile correctly', () => {
  it('PermissionResource covers all resources', () => {
    const resources: PermissionResource[] = [
      'workflows', 'documents', 'notifications', 'integrations',
      'users', 'teams', 'roles', 'billing', 'plugins', 'audit',
      'reports', 'api_keys',
    ];
    expect(resources).toHaveLength(12);
  });

  it('PermissionAction covers all actions', () => {
    const actions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'admin'];
    expect(actions).toHaveLength(5);
  });

  it('PermissionString type accepts resource:action', () => {
    const perm: PermissionString = 'workflows:read';
    expect(perm.split(':')).toHaveLength(2);
  });

  it('PermissionString accepts wildcard admin', () => {
    const perm: PermissionString = '*:admin';
    expect(perm).toBe('*:admin');
  });

  it('PermissionCheck valid shape', () => {
    const check: PermissionCheck = {
      userId: 'user-1',
      permission: 'workflows:read',
    };
    expect(check.permission).toBe('workflows:read');
  });

  it('PermissionCheck with resourceId', () => {
    const check: PermissionCheck = {
      userId: 'user-1',
      permission: 'documents:update',
      resourceId: 'doc-1',
    };
    expect(check.resourceId).toBe('doc-1');
  });

  it('PermissionResult allowed with role info', () => {
    const result: PermissionResult = {
      allowed: true,
      role: 'admin',
      grantedBy: '*:admin',
    };
    expect(result.allowed).toBe(true);
    expect(result.role).toBe('admin');
  });

  it('PermissionResult denied', () => {
    const result: PermissionResult = { allowed: false };
    expect(result.allowed).toBe(false);
    expect(result.role).toBeUndefined();
  });
});

describe('Security types compile correctly', () => {
  it('PasswordPolicy accepts valid shape', () => {
    const policy: PasswordPolicy = {
      minLength: 8,
      requireUpper: true,
      requireLower: true,
      requireNumber: true,
      requireSpecial: true,
      expirationDays: 90,
    };
    expect(policy.minLength).toBe(8);
  });

  it('PasswordPolicy with no expiration', () => {
    const policy: PasswordPolicy = {
      minLength: 6,
      requireUpper: false,
      requireLower: true,
      requireNumber: false,
      requireSpecial: false,
      expirationDays: 0,
    };
    expect(policy.expirationDays).toBe(0);
  });

  it('SecurityPolicy valid shape', () => {
    const policy: SecurityPolicy = {
      tenantId: 'tenant-1',
      passwordPolicy: {
        minLength: 8,
        requireUpper: true,
        requireLower: true,
        requireNumber: true,
        requireSpecial: true,
        expirationDays: 90,
      },
      requireMfa: false,
      mfaMethods: ['app'],
      sessionTimeoutMinutes: 480,
      maxSessionsPerUser: 5,
    };
    expect(policy.sessionTimeoutMinutes).toBe(480);
  });

  it('SecurityPolicy with IP allowlist and MFA', () => {
    const policy: SecurityPolicy = {
      tenantId: 'tenant-1',
      passwordPolicy: {
        minLength: 10,
        requireUpper: true,
        requireLower: true,
        requireNumber: true,
        requireSpecial: true,
        expirationDays: 30,
      },
      requireMfa: true,
      mfaMethods: ['app', 'sms'],
      sessionTimeoutMinutes: 240,
      maxSessionsPerUser: 3,
      ipAllowlist: ['192.168.1.0/24'],
    };
    expect(policy.ipAllowlist).toHaveLength(1);
    expect(policy.requireMfa).toBe(true);
  });
});
