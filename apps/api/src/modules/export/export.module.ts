import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportCapabilityGuard, ExportController } from './export.controller';
import { PrismaService } from '../../common/prisma.service';
import { ImportExportService } from './import-export.service';
import { ClientesCsvImportProcessor } from './clientes-csv-import.processor';
import { CLIENTES_CSV_IMPORT_QUEUE } from './clientes-csv-import.definition';
import { JobsModule } from '../jobs/jobs.module';
import { JobsTenantAuthorityService } from '../jobs/jobs-tenant-authority.service';
import { IdentityOrganizationGuard } from '../identity/identity-organization.guard';
import { IdentityMembershipRepository } from '../identity/identity-membership.repository';
import { IdentityCatalogPreflightService } from '../identity/identity-catalog-preflight.service';
import { authClientProvider } from '../../common/auth-client.provider';

@Module({
  imports: [
    JobsModule,
    BullModule.registerQueue({
      name: CLIENTES_CSV_IMPORT_QUEUE,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: { age: 86_400, count: 100 },
      },
    }),
  ],
  controllers: [ExportController],
  providers: [
    PrismaService,
    ImportExportService,
    ClientesCsvImportProcessor,
    JobsTenantAuthorityService,
    IdentityOrganizationGuard,
    IdentityMembershipRepository,
    IdentityCatalogPreflightService,
    ExportCapabilityGuard,
    authClientProvider,
  ],
})
export class ExportModule {}
