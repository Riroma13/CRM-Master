import { Module, Global, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PrismaService } from '../../common/prisma.service';
import { authClientProvider } from '../../common/auth-client.provider';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    PrismaService,
    authClientProvider,
  ],
  exports: [AuthService, SessionService, authClientProvider],
})
export class AuthModule {}
