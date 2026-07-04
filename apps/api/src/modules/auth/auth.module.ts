import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, PrismaService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
