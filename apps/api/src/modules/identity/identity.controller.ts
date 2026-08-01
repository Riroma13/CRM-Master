import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { IdentityAuthorizationService } from './identity-authorization.service';
import { IdentityOrganizationGuard } from './identity-organization.guard';

class IdentityMutationDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

class IdentityRoleDto extends IdentityMutationDto {
  @IsString()
  role!: string;
}

class IdentityPolicyDto extends IdentityMutationDto {
  @IsObject()
  policy!: Record<string, unknown>;
}

@Controller('api/v1/identity')
export class IdentityController {
  constructor(private readonly service: IdentityAuthorizationService) {}

  @Post('invitations')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('auth', 'create')
  createInvitation(@Body() dto: IdentityMutationDto, @Req() request: Request) {
    return this.mutate(request, 'invitation.create', dto.subjectId ?? 'invitation', 'identity.invitation.created', dto.payload ?? {});
  }

  @Delete('invitations/:invitationId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('auth', 'delete')
  cancelInvitation(@Param('invitationId') invitationId: string, @Req() request: Request) {
    return this.mutate(request, 'invitation.cancel', invitationId, 'identity.invitation.canceled', { invitationId });
  }

  @Post('invitations/:invitationId/accept')
  acceptInvitation(@Param('invitationId') invitationId: string) {
    return { invitationId };
  }

  @Post('memberships')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('user', 'assign')
  createMembership(@Body() dto: IdentityMutationDto, @Req() request: Request) {
    return this.mutate(request, 'membership.create', dto.subjectId ?? 'membership', 'identity.membership.created', dto.payload ?? {});
  }

  @Patch('memberships/:memberId/role')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('role', 'update')
  updateMembershipRole(@Param('memberId') memberId: string, @Body() dto: IdentityRoleDto, @Req() request: Request) {
    return this.mutate(request, 'membership.role.update', memberId, 'identity.membership.role.changed', { memberId, role: dto.role });
  }

  @Delete('memberships/:memberId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('user', 'revoke')
  removeMembership(@Param('memberId') memberId: string, @Req() request: Request) {
    return this.mutate(request, 'membership.remove', memberId, 'identity.membership.removed', { memberId });
  }

  @Post('teams')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('configuration', 'create')
  createTeam(@Body() dto: IdentityMutationDto, @Req() request: Request) {
    return this.mutate(request, 'team.create', dto.subjectId ?? 'team', 'identity.team.created', dto.payload ?? {});
  }

  @Patch('teams/:teamId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('configuration', 'update')
  updateTeam(@Param('teamId') teamId: string, @Body() dto: IdentityMutationDto, @Req() request: Request) {
    return this.mutate(request, 'team.update', teamId, 'identity.team.updated', dto.payload ?? {});
  }

  @Delete('teams/:teamId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('configuration', 'delete')
  deleteTeam(@Param('teamId') teamId: string, @Req() request: Request) {
    return this.mutate(request, 'team.delete', teamId, 'identity.team.deleted', { teamId });
  }

  @Post('roles')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('role', 'create')
  createRole(@Body() dto: IdentityMutationDto, @Req() request: Request) {
    return this.mutate(request, 'role.create', dto.subjectId ?? 'role', 'identity.role.created', dto.payload ?? {});
  }

  @Patch('roles/:roleId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('role', 'update')
  updateRole(@Param('roleId') roleId: string, @Body() dto: IdentityMutationDto, @Req() request: Request) {
    return this.mutate(request, 'role.update', roleId, 'identity.role.updated', dto.payload ?? {});
  }

  @Delete('roles/:roleId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('role', 'delete')
  deleteRole(@Param('roleId') roleId: string, @Req() request: Request) {
    return this.mutate(request, 'role.delete', roleId, 'identity.role.deleted', { roleId });
  }

  @Put('policies/:subjectId')
  @UseGuards(IdentityOrganizationGuard)
  @RequirePermission('permission', 'update')
  replacePolicy(@Param('subjectId') subjectId: string, @Body() dto: IdentityPolicyDto, @Req() request: Request) {
    return this.mutate(request, 'policy.replace', subjectId, 'identity.policy.updated', { subjectId, policy: dto.policy });
  }

  private mutate(request: Request, operation: string, resourceId: string, eventType: string, payload: Record<string, unknown>) {
    const identityRequest = request as Request & { hostTenantId?: string; identitySession?: { userId: string } };
    return this.service.mutate({
      tenantId: identityRequest.hostTenantId!,
      subjectId: identityRequest.identitySession?.userId ?? 'unknown',
      operation,
      resourceId,
      idempotencyKey: String(request.headers['idempotency-key'] ?? ''),
      eventType,
      payload,
    });
  }
}
