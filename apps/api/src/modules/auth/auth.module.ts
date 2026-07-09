import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma.service';
import { authClientProvider } from '../../common/auth-client.provider';
import { TenantsService } from '../tenants/tenants.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    authClientProvider,
    TenantsService,
  ],
  exports: [AuthService, authClientProvider],
})
export class AuthModule {}
