import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryOrchestrator } from './delivery-orchestrator';
import { PrismaService } from '../../../common/prisma.service';

describe('DeliveryOrchestrator', () => {
  let orchestrator: DeliveryOrchestrator;
  let mockPrisma: any;
  let mockProvider: any;

  beforeEach(async () => {
    mockPrisma = {
      admin: {
        notificationInstance: {
          findUnique: jest.fn(),
          update: jest.fn().mockResolvedValue({}),
        },
        notificationReceipt: {
          create: jest.fn().mockResolvedValue({}),
        },
        notificationAudit: {
          create: jest.fn().mockResolvedValue({}),
        },
      },
      forTenant: jest.fn().mockReturnThis(),
      notificationPreference: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    mockProvider = {
      id: 'test-provider',
      name: 'Test Provider',
      channels: ['email'],
      send: jest.fn(),
      verifyWebhookSignature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DeliveryOrchestrator,
          useFactory: () => new DeliveryOrchestrator(mockPrisma, { backoffMs: [10, 20, 50] }),
        },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    orchestrator = module.get<DeliveryOrchestrator>(DeliveryOrchestrator);
    orchestrator.setProvider(mockProvider);
  });

  it('should skip delivery for already delivered notifications', async () => {
    mockPrisma.admin.notificationInstance.findUnique.mockResolvedValue({
      id: 'notif-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      status: 'delivered',
      channel: 'email',
      content: { subject: 'Test', body: 'Hello' },
    });

    await orchestrator.deliver('notif-1');
    expect(mockProvider.send).not.toHaveBeenCalled();
  });

  it('should deliver successfully with idempotencyKey', async () => {
    mockPrisma.admin.notificationInstance.findUnique.mockResolvedValue({
      id: 'notif-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      status: 'pending',
      channel: 'email',
      idempotencyKey: 'idem-1',
      content: { subject: 'Test', body: 'Hello' },
      createdAt: new Date(),
    });

    mockProvider.send.mockResolvedValue({
      success: true,
      externalId: 'ext-1',
      status: 'DELIVERED',
    });

    await orchestrator.deliver('notif-1');

    expect(mockProvider.send).toHaveBeenCalledWith(
      'email',
      expect.objectContaining({ idempotencyKey: 'idem-1' }),
    );
    expect(mockPrisma.admin.notificationReceipt.create).toHaveBeenCalled();
  });

  it('should retry on failure and then move to DLQ', async () => {
    jest.setTimeout(10000);
    mockPrisma.admin.notificationInstance.findUnique.mockResolvedValue({
      id: 'notif-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      status: 'pending',
      channel: 'email',
      idempotencyKey: 'idem-1',
      content: { subject: 'Test', body: 'Hello' },
      createdAt: new Date(),
      receipts: [],
    });

    mockProvider.send.mockRejectedValue(new Error('Provider unavailable'));

    await orchestrator.deliver('notif-1');

    expect(mockPrisma.admin.notificationInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });
});
