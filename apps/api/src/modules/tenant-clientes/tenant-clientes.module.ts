import { Module, forwardRef } from '@nestjs/common';
import { TenantClientesController } from './tenant-clientes.controller';
import { TenantClientesService } from './tenant-clientes.service';
import { PrismaService } from '../../common/prisma.service';
import { TenantAutomationsModule } from '../tenant-automations/tenant-automations.module';

@Module({
  imports: [forwardRef(() => TenantAutomationsModule)],
  controllers: [TenantClientesController],
  providers: [TenantClientesService, PrismaService],
  exports: [TenantClientesService],
})
export class TenantClientesModule {}
