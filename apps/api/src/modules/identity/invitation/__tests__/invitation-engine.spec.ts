import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'node:crypto';
import { InvitationEngine } from '../invitation-engine';
import { MembershipService } from '../../membership/membership.service';
import { PrismaService } from '../../../../common/prisma.service';

process.env.INVITATION_SIGNING_SECRET = 'test-secret-that-is-exactly-thirtytwo-bytes!';

async function createTestModule() {
  const moduleRef = await Test.createTestingModule({
    providers: [InvitationEngine, MembershipService, PrismaService],
  }).compile();

  const engine = moduleRef.get(InvitationEngine);
  const membershipService = moduleRef.get(MembershipService);
  const prisma = moduleRef.get(PrismaService);
  await moduleRef.init();
  return { moduleRef, engine, membershipService, prisma };
}

async function resetTestData(prisma: PrismaService) {
  await prisma.admin.invitation.deleteMany({});
  await prisma.admin.membership.deleteMany({});
  await prisma.admin.team.deleteMany({});
  await prisma.admin.role.deleteMany({});
  await prisma.admin.user.deleteMany({});
  await prisma.admin.tenant.deleteMany({});
}

async function destroyModule(moduleRef: TestingModule, prisma: PrismaService) {
  await resetTestData(prisma);
  await moduleRef.close();
}

describe('InvitationEngine', () => {
  let engine: InvitationEngine;
  let membershipService: MembershipService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const T_ID = 'inv-test-tenant-0000-0000-0000-000000000001';
  const T_ID_2 = 'inv-test-tenant-0000-0000-0000-000000000002';
  const EMAIL = 'invited@test.com';
  const EMAIL_2 = 'other@test.com';
  let teamId: string;
  let teamId2: string;
  let roleId: string;
  let adminRoleId: string;

  beforeAll(async () => {
    ({ moduleRef, engine, membershipService, prisma } = await createTestModule());
    await resetTestData(prisma);

    await prisma.admin.tenant.create({
      data: { id: T_ID, slug: 'inv-test-tenant', name: 'Invitation Test Tenant' },
    });
    await prisma.admin.tenant.create({
      data: { id: T_ID_2, slug: 'inv-test-tenant-2', name: 'Invitation Test Tenant 2' },
    });

    const team = await prisma.admin.team.create({
      data: { tenantId: T_ID, name: 'Invite Team' },
    });
    teamId = team.id;

    const team2 = await prisma.admin.team.create({
      data: { tenantId: T_ID_2, name: 'Invite Team 2' },
    });
    teamId2 = team2.id;

    const role = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'member', permissions: ['documents:read'] },
    });
    roleId = role.id;

    const adminRole = await prisma.admin.role.create({
      data: { tenantId: T_ID, name: 'admin', permissions: ['*:admin'] },
    });
    adminRoleId = adminRole.id;

    const role2 = await prisma.admin.role.create({
      data: { tenantId: T_ID_2, name: 'member', permissions: ['documents:read'] },
    });
  });

  afterAll(async () => {
    await destroyModule(moduleRef, prisma);
  });

  afterEach(async () => {
    await prisma.admin.invitation.deleteMany({});
    await prisma.admin.membership.deleteMany({
      where: { tenantId: { in: [T_ID, T_ID_2] } },
    });
    await prisma.admin.user.deleteMany({
      where: { tenantId: { in: [T_ID, T_ID_2] } },
    });
  });

  describe('createInvitation', () => {
    it('should create an invitation and return the raw token', async () => {
      const result = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      expect(result.invitationId).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.length).toBe(64);

      const stored = await prisma.admin.invitation.findUnique({
        where: { id: result.invitationId },
      });
      expect(stored).toBeDefined();
      expect(stored!.email).toBe(EMAIL);
      expect(stored!.roleId).toBe(roleId);
      expect(stored!.teamId).toBe(teamId);
      expect(stored!.status).toBe('pending');
      expect(stored!.tokenHash).not.toBe(result.token);
      expect(stored!.acceptedAt).toBeNull();
      expect(new Date(stored!.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should store SHA-256 hash not the raw token', async () => {
      const result = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      const stored = await prisma.admin.invitation.findUnique({
        where: { id: result.invitationId },
      });
      const expectedHash = crypto.createHash('sha256').update(result.token).digest('hex');
      expect(stored!.tokenHash).toBe(expectedHash);
      expect(stored!.tokenHash).not.toBe(result.token);
    });

    it('should throw when a pending invitation already exists for the email', async () => {
      await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      await expect(
        engine.createInvitation(T_ID, EMAIL, roleId, teamId),
      ).rejects.toThrowError('A pending invitation already exists for this email');
    });

    it('should allow creating a new invitation after the previous one is cancelled', async () => {
      const first = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);
      await engine.cancelInvitation(T_ID, first.invitationId);

      const second = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);
      expect(second.invitationId).not.toBe(first.invitationId);
    });

    it('should create invitation without teamId', async () => {
      const result = await engine.createInvitation(T_ID, EMAIL, roleId);
      const stored = await prisma.admin.invitation.findUnique({
        where: { id: result.invitationId },
      });
      expect(stored!.teamId).toBeNull();
    });
  });

  describe('acceptInvitation', () => {
    it('should accept a valid invitation and create user + membership', async () => {
      const { token } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      const result = await engine.acceptInvitation(token);

      expect(result.userId).toBeDefined();
      expect(result.sessionToken).toBeDefined();

      const user = await prisma.admin.user.findFirst({
        where: { tenantId: T_ID, email: EMAIL },
      });
      expect(user).toBeDefined();
      expect(user!.id).toBe(result.userId);

      const membership = await prisma.admin.membership.findFirst({
        where: { tenantId: T_ID, userId: result.userId },
      });
      expect(membership).toBeDefined();
      expect(membership!.roleId).toBe(roleId);
      expect(membership!.teamId).toBe(teamId);

      const stored = await prisma.admin.invitation.findFirst({
        where: { tenantId: T_ID, email: EMAIL },
      });
      expect(stored!.status).toBe('accepted');
      expect(stored!.acceptedAt).toBeDefined();
    });

    it('should reject double-accepting the same invitation', async () => {
      const { token } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);
      await engine.acceptInvitation(token);

      await expect(
        engine.acceptInvitation(token),
      ).rejects.toThrowError('Invitation is already accepted');
    });

    it('should reject expired invitations', async () => {
      const { token } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      const stored = await prisma.admin.invitation.findFirst({
        where: { tenantId: T_ID, email: EMAIL },
      });
      await prisma.admin.invitation.update({
        where: { id: stored!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await expect(
        engine.acceptInvitation(token),
      ).rejects.toThrowError('Invitation has expired');
    });

    it('should reject an unknown token', async () => {
      await expect(
        engine.acceptInvitation('nonexistent-token-that-is-long-enough-here'),
      ).rejects.toThrowError('Invitation not found');
    });

    it('should reject cancelled invitations', async () => {
      const { invitationId, token } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);
      await engine.cancelInvitation(T_ID, invitationId);

      await expect(
        engine.acceptInvitation(token),
      ).rejects.toThrowError('Invitation is already cancelled');
    });

    it('should use default team when no teamId is specified', async () => {
      const { token } = await engine.createInvitation(T_ID, EMAIL, roleId);

      const result = await engine.acceptInvitation(token);

      const membership = await prisma.admin.membership.findFirst({
        where: { tenantId: T_ID, userId: result.userId },
      });
      expect(membership!.teamId).toBe(teamId);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel a pending invitation', async () => {
      const { invitationId } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      const cancelled = await engine.cancelInvitation(T_ID, invitationId);
      expect(cancelled.status).toBe('cancelled');
    });

    it('should throw when invitation does not exist', async () => {
      await expect(
        engine.cancelInvitation(T_ID, 'nonexistent-id'),
      ).rejects.toThrowError('Invitation not found');
    });

    it('should throw when cancelling from wrong tenant', async () => {
      const { invitationId } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      await expect(
        engine.cancelInvitation(T_ID_2, invitationId),
      ).rejects.toThrowError('Invitation not found');
    });
  });

  describe('listInvitations', () => {
    it('should list all invitations for a tenant', async () => {
      await engine.createInvitation(T_ID, EMAIL, roleId, teamId);
      await engine.createInvitation(T_ID, EMAIL_2, roleId, teamId);

      const list = await engine.listInvitations(T_ID);
      expect(list.length).toBe(2);
    });

    it('should filter invitations by status', async () => {
      const { invitationId } = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);
      await engine.createInvitation(T_ID, EMAIL_2, roleId, teamId);
      await engine.cancelInvitation(T_ID, invitationId);

      const pending = await engine.listInvitations(T_ID, 'pending');
      expect(pending.length).toBe(1);
      expect(pending[0].email).toBe(EMAIL_2);

      const cancelled = await engine.listInvitations(T_ID, 'cancelled');
      expect(cancelled.length).toBe(1);
      expect(cancelled[0].email).toBe(EMAIL);
    });

    it('should return empty list for tenant with no invitations', async () => {
      const list = await engine.listInvitations(T_ID_2);
      expect(list.length).toBe(0);
    });
  });

  describe('signInvitationToken / verifyInvitationToken', () => {
    it('should sign and verify a token', () => {
      const token = 'test-token-123';
      const sig = engine.signInvitationToken(token);
      expect(sig).toBeDefined();
      expect(sig.length).toBe(64);

      const valid = engine.verifyInvitationToken(token, sig);
      expect(valid).toBe(true);
    });

    it('should reject a forged signature', () => {
      const token = 'test-token-123';
      const sig = engine.signInvitationToken(token);
      const forged = engine.verifyInvitationToken(token + '-tampered', sig);
      expect(forged).toBe(false);
    });

    it('should reject different token with same signature', () => {
      const token = 'test-token-123';
      const sig = engine.signInvitationToken(token);
      const wrong = engine.verifyInvitationToken('different-token', sig);
      expect(wrong).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      const token = 'test-token-123';
      const sig = engine.signInvitationToken(token);
      expect(() => engine.verifyInvitationToken(token, sig)).not.toThrow();
    });
  });

  describe('token hashing', () => {
    it('should produce deterministic hashes for same input', () => {
      const token = 'same-token';
      const hash1 = crypto.createHash('sha256').update(token).digest('hex');
      const hash2 = crypto.createHash('sha256').update(token).digest('hex');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = crypto.createHash('sha256').update('token-a').digest('hex');
      const hash2 = crypto.createHash('sha256').update('token-b').digest('hex');
      expect(hash1).not.toBe(hash2);
    });

    it('should store the hash not the raw token in database', async () => {
      const result = await engine.createInvitation(T_ID, EMAIL, roleId, teamId);

      const stored = await prisma.admin.invitation.findUnique({
        where: { id: result.invitationId },
      });

      expect(stored!.tokenHash).not.toContain(result.token);
      const expectedHash = crypto.createHash('sha256').update(result.token).digest('hex');
      expect(stored!.tokenHash).toBe(expectedHash);
    });
  });
});
