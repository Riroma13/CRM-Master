import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGuard } from './guards/notification.guard';
import { PrismaService } from '../../common/prisma.service';

describe('Notification Cross-Tenant Isolation (Doorbell)', () => {
  let guard: NotificationGuard;

  const mockRequest = (tenantId: string, id?: string) => ({
    query: { tenantId },
    params: { id },
    body: {},
    headers: {},
  });

  beforeEach(async () => {
    const mockPrisma = {
      forTenant: jest.fn().mockImplementation((tenantId: string) => ({
        notificationInstance: {
          findFirst: jest.fn().mockImplementation(({ where }: any) => {
            if (tenantId === 'tenant-a' && where.id === 'notif-a') {
              return { id: 'notif-a', tenantId: 'tenant-a', status: 'pending' };
            }
            return null;
          }),
        },
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<NotificationGuard>(NotificationGuard);
  });

  it('Tenant B should be denied access to Tenant A notifications', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-b', 'notif-a'),
      }),
    };
    await expect(guard.canActivate(context)).rejects.toThrow();
  });

  it('Tenant A should access their own notifications', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-a', 'notif-a'),
      }),
    };
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should require tenantId', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ query: {}, params: {}, body: {}, headers: {} }),
      }),
    };
    await expect(guard.canActivate(context)).rejects.toThrow('tenantId is required');
  });
});
