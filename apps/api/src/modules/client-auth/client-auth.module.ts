import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ClientAuthController } from './client-auth.controller';
import { ClientAuthService } from './client-auth.service';
import { ClientAuthGuard } from './client-auth.guard';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ClientAuthController],
  providers: [ClientAuthService, ClientAuthGuard, PrismaService],
  exports: [ClientAuthService, ClientAuthGuard],
})
export class ClientAuthModule implements OnModuleInit {
  private readonly logger = new Logger(ClientAuthModule.name);

  onModuleInit() {
    const secret = process.env.CLIENT_JWT_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CLIENT_JWT_SECRET environment variable is required in production');
      }
      this.logger.warn('CLIENT_JWT_SECRET not set — using dev fallback (NOT suitable for production)');
    }
  }
}
