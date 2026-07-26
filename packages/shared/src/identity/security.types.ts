export interface PasswordPolicy {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  expirationDays: number;
}

export interface SecurityPolicy {
  tenantId: string;
  passwordPolicy: PasswordPolicy;
  requireMfa: boolean;
  mfaMethods: string[];
  sessionTimeoutMinutes: number;
  maxSessionsPerUser: number;
  ipAllowlist?: string[];
}
