import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AUTH_CLIENT, authClientProvider } from '../../common/auth-client.provider';
import { PrismaService } from '../../common/prisma.service';
import { IdentityAuthorizationProcessor } from './identity-authorization.processor';
import { IdentityAuthorizationRepository } from './identity-authorization.repository';
import { IdentityAuthorizationService } from './identity-authorization.service';
import { IDENTITY_CATALOG_SNAPSHOT } from './identity-catalog.config';
import { IdentityCatalogPreflightService } from './identity-catalog-preflight.service';
import { IdentityController } from './identity.controller';
import { IdentityAuditDispatcherService } from './identity-audit-dispatcher.service';
import { IdentityMembershipRepository } from './identity-membership.repository';
import { IdentityOrganizationGuard } from './identity-organization.guard';
import {
  IDENTITY_AUDIT_DLQ_QUEUE,
  IDENTITY_AUDIT_INGESTION_QUEUE,
} from '../audit/audit-queue.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: IDENTITY_AUDIT_INGESTION_QUEUE },
      { name: IDENTITY_AUDIT_DLQ_QUEUE },
    ),
  ],
  controllers: [IdentityController],
  providers: [
    authClientProvider,
    IdentityAuthorizationProcessor,
    IdentityAuthorizationRepository,
    IdentityAuthorizationService,
    IdentityAuditDispatcherService,
    IdentityCatalogPreflightService,
    IdentityMembershipRepository,
    IdentityOrganizationGuard,
    PrismaService,
  ],
  exports: [
    AUTH_CLIENT,
    IdentityAuditDispatcherService,
    IdentityOrganizationGuard,
    IdentityMembershipRepository,
  ],
})
export class IdentityModule implements OnModuleInit {
  constructor(private readonly preflight: IdentityCatalogPreflightService) {}

  onModuleInit() {
    this.preflight.check(IDENTITY_CATALOG_SNAPSHOT);
  }
}
