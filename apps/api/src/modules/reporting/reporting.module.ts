import { Global, Module, OnModuleInit, Injectable } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { PrismaService } from '../../common/prisma.service';
import { createReportingReadOnlyMiddleware } from './reporting-read-only.middleware';

@Injectable()
class ReportingReadOnlyRegistrar implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const client = this.prisma.admin as any;
    client.$use(createReportingReadOnlyMiddleware());
  }
}

@Global()
@Module({
  controllers: [ReportingController],
  providers: [
    ReportingService,
    PrismaService,
    ReportingReadOnlyRegistrar,
  ],
  exports: [ReportingService],
})
export class ReportingModule {}
