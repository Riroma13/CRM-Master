import { Test, TestingModule } from '@nestjs/testing';
import { PreferenceGuard } from './guards/preference.guard';
import { PrismaService } from '../../common/prisma.service';

describe('Notification Preference Isolation (Doorbell)', () => {
  let guard: PreferenceGuard;

  const mockRequest = (tenantId: string, body: any = {}) => ({
    query: { tenantId },
    params: {},
    body,
    headers: {},
  });

  beforeEach(async () => {
    const mockPrisma = {
      forTenant: jest.fn().mockImplementation((tenantId: string) => ({
        notificationPreference: {
          findFirst: jest.fn().mockImplementation(({ where }: any) => {
            if (tenantId === 'tenant-a' && where.id === 'pref-a') {
              return { id: 'pref-a', tenantId: 'tenant-a', userId: 'user-a', enabled: true };
            }
            return null;
          }),
        },
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferenceGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<PreferenceGuard>(PreferenceGuard);
  });

  it('Tenant B should be denied access to Tenant A preferences', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest('tenant-b', { userId: 'user-a' }),
      }),
    };
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should require tenantId in body or query', async () => {
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ query: {}, params: {}, body: {}, headers: {} }),
      }),
    };
    await expect(guard.canActivate(context)).rejects.toThrow('tenantId is required');
  });
});
