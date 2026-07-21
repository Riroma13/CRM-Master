import { Test, TestingModule } from '@nestjs/testing';
import { AlertWebhookController, AlertManagerPayload } from '../alerting/alert-webhook.controller';
import { AlertService } from '../alerting/alert.service';
import { PrismaService } from '../../../common/prisma.service';

describe('AlertWebhookController', () => {
  let controller: AlertWebhookController;
  let alertService: any;

  const mockAlertEvent = {
    create: jest.fn().mockResolvedValue({ id: '1', ruleName: 'HighErrorRate' }),
    findFirst: jest.fn().mockResolvedValue({ id: '1', ruleName: 'HighErrorRate', status: 'firing' }),
    update: jest.fn().mockResolvedValue({ id: '1', ruleName: 'HighErrorRate', status: 'resolved' }),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockAlertRule = {
    findMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertWebhookController],
      providers: [
        AlertService,
        {
          provide: PrismaService,
          useValue: {
            admin: {
              alertEvent: mockAlertEvent,
              alertRule: mockAlertRule,
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AlertWebhookController>(AlertWebhookController);
    alertService = module.get(AlertService);
  });

  it('MUST be defined', () => {
    expect(controller).toBeDefined();
  });

  it('MUST handle valid webhook payload with firing alert', async () => {
    const payload: AlertManagerPayload = {
      status: 'firing',
      alerts: [
        {
          status: 'firing',
          labels: { alertname: 'HighErrorRate', severity: 'critical' },
          annotations: { summary: 'Error rate is high' },
          startsAt: '2026-07-20T00:00:00Z',
          endsAt: '0001-01-01T00:00:00Z',
          values: { value: 0.1 },
        },
      ],
    };

    const result = await controller.receiveWebhook(payload);
    expect(result.received).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('MUST handle resolved alert', async () => {
    const payload: AlertManagerPayload = {
      status: 'resolved',
      alerts: [
        {
          status: 'resolved',
          labels: { alertname: 'HighErrorRate', severity: 'critical' },
          annotations: { summary: 'Error rate normal' },
          startsAt: '2026-07-20T00:00:00Z',
          endsAt: '2026-07-20T01:00:00Z',
        },
      ],
    };

    const result = await controller.receiveWebhook(payload);
    expect(result.received).toBe(1);
    expect(result.errors).toBe(0);
  });

  it('MUST reject invalid payload without alerts array', async () => {
    const payload = { status: 'firing' };
    const result = await controller.receiveWebhook(payload as any);
    expect(result.received).toBe(0);
    expect(result.errors).toBe(1);
  });

  it('MUST handle multiple alerts in one payload', async () => {
    const payload: AlertManagerPayload = {
      status: 'firing',
      alerts: [
        {
          status: 'firing',
          labels: { alertname: 'HighErrorRate', severity: 'critical' },
          annotations: { summary: 'High error rate' },
          startsAt: '2026-07-20T00:00:00Z',
          endsAt: '0001-01-01T00:00:00Z',
        },
        {
          status: 'firing',
          labels: { alertname: 'QueueBacklog', severity: 'warning' },
          annotations: { description: 'Queue depth > 1000' },
          startsAt: '2026-07-20T00:00:00Z',
          endsAt: '0001-01-01T00:00:00Z',
        },
      ],
    };

    const result = await controller.receiveWebhook(payload);
    expect(result.received).toBe(2);
    expect(result.errors).toBe(0);
  });
});
