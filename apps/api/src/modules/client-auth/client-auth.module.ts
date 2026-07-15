import { Module } from '@nestjs/common';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { ClientAuthGuard } from './client-auth.guard';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ClientAuthController],
  providers: [ClientAuthService, ClientAuthGuard, PrismaService],
  exports: [ClientAuthService, ClientAuthGuard],
})
export class ClientAuthModule {}
