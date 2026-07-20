import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../common/prisma.service';

describe('Notification Deduplication', () => {
  let service: NotificationService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      forTenant: jest.fn().mockReturnThis(),
      notificationInstance: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue({ id: 'def-1', tenantId: 'tenant-1', isPublished: true, defaultPriority: 'normal', defaultSeverity: 'info', template: {} }),
        create: jest.fn().mockImplementation(({ data }: any) => ({
          id: 'notif-' + Date.now(),
          ...data,
        })),
        update: jest.fn().mockResolvedValue({}),
      },
      notificationDefinition: {
        findFirst: jest.fn().mockResolvedValue({ id: 'def-1', tenantId: 'tenant-1', isPublished: true, defaultPriority: 'normal', defaultSeverity: 'info', template: {} }),
      },
      notificationAudit: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('idempotencyKey unique constraint', () => {
    it('should return existing notification id when idempotencyKey matches', async () => {
      mockPrisma.forTenant().notificationInstance.findUnique.mockResolvedValue({
        id: 'existing-notif',
        idempotencyKey: 'dup-key-1',
      });

      const id = await service.createNotification('tenant-1', {
        definitionId: 'def-1',
        userId: 'user-1',
        idempotencyKey: 'dup-key-1',
      });

      expect(id).toBe('existing-notif');
      expect(mockPrisma.notificationInstance.create).not.toHaveBeenCalled();
    });

    it('should create new notification when idempotencyKey is unique', async () => {
      mockPrisma.forTenant().notificationInstance.findUnique.mockResolvedValue(null);

      const id = await service.createNotification('tenant-1', {
        definitionId: 'def-1',
        userId: 'user-1',
        idempotencyKey: 'unique-key-1',
      });

      expect(id).toBeDefined();
      expect(mockPrisma.notificationInstance.create).toHaveBeenCalled();
    });
  });

  describe('state check on retry', () => {
    it('should reject cancel for already delivered notification', async () => {
      mockPrisma.forTenant().notificationInstance.findFirst.mockResolvedValue({
        id: 'delivered-notif',
        status: 'delivered',
      });

      await expect(
        service.cancelNotification('tenant-1', 'delivered-notif'),
      ).rejects.toThrow('Cannot cancel notification in status: delivered');
    });

    it('should allow cancel for pending notification', async () => {
      mockPrisma.forTenant().notificationInstance.findFirst.mockResolvedValue({
        id: 'pending-notif',
        status: 'pending',
      });

      const result = await service.cancelNotification('tenant-1', 'pending-notif');
      expect(result).toBeDefined();
    });
  });
});
