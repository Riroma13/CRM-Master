export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  timezone?: string;
  language?: string;
  active: boolean;
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentTeamId?: string;
  depth: number;
  memberCount: number;
}

export interface Membership {
  userId: string;
  teamId: string;
  roleId: string;
}

export interface Role {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault: boolean;
  isSystem: boolean;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  roleId: string;
  teamId?: string;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string;
}
