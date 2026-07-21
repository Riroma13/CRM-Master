import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from '../alerting/alert.service';
import { PrismaService } from '../../../common/prisma.service';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: any;

  const mockAlertEvent = {
    create: jest.fn().mockResolvedValue({ id: '1', ruleName: 'HighErrorRate', severity: 'critical', status: 'firing', value: 0.1, threshold: 0.05, message: 'test', startedAt: new Date(), createdAt: new Date() }),
    findFirst: jest.fn().mockResolvedValue({ id: '1', ruleName: 'HighErrorRate', status: 'firing' }),
    update: jest.fn().mockResolvedValue({ id: '1', ruleName: 'HighErrorRate', status: 'resolved', resolvedAt: new Date() }),
    findMany: jest.fn().mockResolvedValue([{ id: '1', ruleName: 'HighErrorRate' }]),
    count: jest.fn().mockResolvedValue(1),
  };

  const mockAlertRule = {
    findMany: jest.fn().mockResolvedValue([{ id: '1', name: 'HighErrorRate', enabled: true }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<AlertService>(AlertService);
    prisma = module.get(PrismaService);
  });

  it('MUST be defined', () => {
    expect(service).toBeDefined();
  });

  it('MUST create an alert event', async () => {
    const result = await service.createAlertEvent('HighErrorRate', 'critical', 0.1, 0.05, 'test');
    expect(result).toBeDefined();
    expect(result.ruleName).toBe('HighErrorRate');
    expect(mockAlertEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ruleName: 'HighErrorRate', severity: 'critical' }),
    }));
  });

  it('MUST resolve an active alert', async () => {
    const result = await service.resolveAlert('HighErrorRate');
    expect(result).toBeDefined();
    expect(result!.status).toBe('resolved');
  });

  it('MUST return null when resolving non-existent alert', async () => {
    mockAlertEvent.findFirst.mockResolvedValueOnce(null);
    const result = await service.resolveAlert('NonExistent');
    expect(result).toBeNull();
  });

  it('MUST list alerts with pagination', async () => {
    const result = await service.listAlerts({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('MUST return alert rules', async () => {
    const result = await service.getAlertRules();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('HighErrorRate');
  });
});
