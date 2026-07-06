import { Provider, FactoryProvider } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { createAuth, Auth } from './auth';

export const AUTH_CLIENT = 'AUTH_CLIENT';

export const authClientProvider: FactoryProvider = {
  provide: AUTH_CLIENT,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService): Auth => {
    return createAuth(prisma.$client);
  },
};
