import { Module, Global } from '@nestjs/common';
import { RBACEngine } from './rbac/rbac-engine';
import { PermissionGuard } from './rbac/permission.guard';
import { InvitationEngine } from './invitation/invitation-engine';
import { MembershipService } from './membership/membership.service';
import { SecurityPolicyService } from './policy/security-policy.service';
import { TeamService } from './team/team.service';
import { PrismaService } from '../../common/prisma.service';
import { DirectoryService } from './directory/directory.service';

@Global()
@Module({
  providers: [
    DirectoryService,
    InvitationEngine,
    MembershipService,
    PermissionGuard,
    PrismaService,
    RBACEngine,
    SecurityPolicyService,
    TeamService,
  ],
  exports: [
    DirectoryService,
    InvitationEngine,
    MembershipService,
    PermissionGuard,
    PrismaService,
    RBACEngine,
    SecurityPolicyService,
    TeamService,
  ],
})
export class IdentityModule {}
