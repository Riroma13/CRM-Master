import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PreferenceService } from './preferences/preference.service';
import { PrismaService } from '../../common/prisma.service';

describe('NotificationController (integration)', () => {
  let app: INestApplication;
  let mockNotificationService: any;
  let mockPreferenceService: any;

  const mockPrisma = {
    forTenant: jest.fn().mockReturnThis(),
    notificationInstance: {
      findFirst: jest.fn().mockResolvedValue({ id: 'notif-1', tenantId: 'tenant-1' }),
    },
    notificationPreference: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  beforeEach(async () => {
    mockNotificationService = {
      createNotification: jest.fn().mockResolvedValue('notif-1'),
      listNotifications: jest.fn().mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0 } }),
      getNotification: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'pending' }),
      cancelNotification: jest.fn().mockResolvedValue({ id: 'notif-1', status: 'cancelled' }),
    };

    mockPreferenceService = {
      upsertPreference: jest.fn().mockResolvedValue({ id: 'pref-1', enabled: true }),
      getPreferences: jest.fn().mockResolvedValue(null),
      deletePreference: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: PreferenceService, useValue: mockPreferenceService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /notifications', () => {
    it('should create a notification', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications')
        .send({ tenantId: 'tenant-1', definitionId: 'def-1', userId: 'user-1' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.id).toBe('notif-1');
    });
  });

  describe('GET /notifications', () => {
    it('should list notifications', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .query({ tenantId: 'tenant-1' })
        .expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });
  });

  describe('GET /notifications/:id', () => {
    it('should get a notification by id', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/notif-1')
        .query({ tenantId: 'tenant-1' })
        .expect(200);
      expect(res.body).toHaveProperty('id', 'notif-1');
    });
  });

  describe('POST /notifications/:id/cancel', () => {
    it('should cancel a notification', async () => {
      const res = await request(app.getHttpServer())
        .post('/notifications/notif-1/cancel')
        .query({ tenantId: 'tenant-1' })
        .expect(201);
      expect(res.body).toHaveProperty('status', 'cancelled');
    });
  });

  describe('PATCH /notifications/preferences', () => {
    it('should update preferences', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/preferences')
        .send({ tenantId: 'tenant-1', userId: 'user-1', enabled: false })
        .expect(200);
      expect(res.body).toHaveProperty('enabled', true);
    });
  });
});
