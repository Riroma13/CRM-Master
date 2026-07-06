import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma.service';
import { authClientProvider } from '../../common/auth-client.provider';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PrismaService,
    authClientProvider,
  ],
  exports: [AuthService, authClientProvider],
})
export class AuthModule {}
