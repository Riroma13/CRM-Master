import { Module } from '@nestjs/common';
import { ClientUserManagementController } from './client-user-management.controller';
import { ClientUserManagementService } from './client-user-management.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ClientUserManagementController],
  providers: [ClientUserManagementService, PrismaService],
  exports: [ClientUserManagementService],
})
export class ClientUserManagementModule {}
