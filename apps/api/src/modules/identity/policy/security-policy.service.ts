import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import type { SecurityPolicy, PasswordPolicy } from '@shared/identity';

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUpper: true,
  requireLower: true,
  requireNumber: true,
  requireSpecial: true,
  expirationDays: 90,
};

function defaultPolicy(tenantId: string): SecurityPolicy {
  return {
    tenantId,
    passwordPolicy: { ...DEFAULT_PASSWORD_POLICY },
    requireMfa: false,
    mfaMethods: [],
    sessionTimeoutMinutes: 480,
    maxSessionsPerUser: 5,
  };
}

function toSecurityPolicy(record: any): SecurityPolicy {
  return {
    tenantId: record.tenantId,
    passwordPolicy: record.passwordPolicy as unknown as PasswordPolicy,
    requireMfa: record.requireMfa,
    mfaMethods: record.mfaMethods as string[],
    sessionTimeoutMinutes: record.sessionTimeoutMinutes,
    maxSessionsPerUser: record.maxSessionsPerUser,
    ipAllowlist: record.ipAllowlist?.length ? (record.ipAllowlist as string[]) : undefined,
  };
}

@Injectable()
export class SecurityPolicyService {
  private readonly logger = new Logger(SecurityPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(tenantId: string): Promise<SecurityPolicy> {
    const record = await this.prisma.admin.securityPolicy.findUnique({
      where: { tenantId },
    });

    if (!record) return defaultPolicy(tenantId);

    return toSecurityPolicy(record);
  }

  async updatePolicy(
    tenantId: string,
    data: Partial<Omit<SecurityPolicy, 'tenantId'>>,
  ): Promise<SecurityPolicy> {
    const existing = await this.prisma.admin.securityPolicy.findUnique({
      where: { tenantId },
    });

    if (existing) {
      const updateData: Record<string, unknown> = {};
      if (data.passwordPolicy !== undefined) updateData.passwordPolicy = data.passwordPolicy as object;
      if (data.requireMfa !== undefined) updateData.requireMfa = data.requireMfa;
      if (data.mfaMethods !== undefined) updateData.mfaMethods = data.mfaMethods;
      if (data.sessionTimeoutMinutes !== undefined) updateData.sessionTimeoutMinutes = data.sessionTimeoutMinutes;
      if (data.maxSessionsPerUser !== undefined) updateData.maxSessionsPerUser = data.maxSessionsPerUser;
      if (data.ipAllowlist !== undefined) updateData.ipAllowlist = data.ipAllowlist;

      const record = await this.prisma.admin.securityPolicy.update({
        where: { tenantId },
        data: updateData,
      });
      return toSecurityPolicy(record);
    }

    const record = await this.prisma.admin.securityPolicy.create({
      data: {
        tenantId,
        passwordPolicy: (data.passwordPolicy ?? DEFAULT_PASSWORD_POLICY) as object,
        requireMfa: data.requireMfa ?? false,
        mfaMethods: data.mfaMethods ?? [],
        sessionTimeoutMinutes: data.sessionTimeoutMinutes ?? 480,
        maxSessionsPerUser: data.maxSessionsPerUser ?? 5,
        ipAllowlist: data.ipAllowlist ?? [],
      },
    });
    return toSecurityPolicy(record);
  }
}
