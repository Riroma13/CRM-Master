import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HttpException } from '@nestjs/common';
import { PlanLimitGuard, PLAN_LIMIT_METRIC_KEY } from '../guards/plan-limit.guard';
import { PlanLimitsService } from '../plan/plan-limits.service';

describe('PlanLimitGuard', () => {
  let guard: PlanLimitGuard;
  let mockPlanLimitsService: jest.Mocked<PlanLimitsService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockRequest: any;
  let mockResponse: any;
  let mockContext: any;

  beforeAll(async () => {
    mockPlanLimitsService = {
      checkLimit: jest.fn(),
      getRemaining: jest.fn(),
      getAllLimits: jest.fn(),
    } as any;

    mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: PlanLimitsService, useValue: mockPlanLimitsService },
      ],
    }).compile();

    guard = module.get(PlanLimitGuard);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResponse = {
      header: jest.fn(),
    };
    mockRequest = {
      tenantId: 'tenant-001',
      res: mockResponse,
    };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };
  });

  it('allows request when no metric is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockPlanLimitsService.checkLimit).not.toHaveBeenCalled();
  });

  it('allows request when within limit', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('workflows');
    mockPlanLimitsService.checkLimit.mockResolvedValue({
      allowed: true,
      metric: 'workflows',
      current: 30,
      limit: 100,
      remaining: 70,
      type: 'hard',
    });

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockPlanLimitsService.checkLimit).toHaveBeenCalledWith(
      'tenant-001',
      'workflows',
    );
  });

  it('throws 429 when limit exceeded', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('workflows');
    mockPlanLimitsService.checkLimit.mockResolvedValue({
      allowed: false,
      metric: 'workflows',
      current: 100,
      limit: 100,
      remaining: 0,
      type: 'hard',
    });

    await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);

    try {
      await guard.canActivate(mockContext);
    } catch (e: any) {
      expect(e.getStatus()).toBe(429);
      expect(e.getResponse()).toEqual({
        error: 'plan_limit_exceeded',
        metric: 'workflows',
        current: 100,
        limit: 100,
      });
    }
  });

  it('returns true when no tenantId is available', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('workflows');
    mockRequest.tenantId = undefined;

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockPlanLimitsService.checkLimit).not.toHaveBeenCalled();
  });

  it('sets warning header at 80% usage', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('workflows');
    mockPlanLimitsService.checkLimit.mockResolvedValue({
      allowed: true,
      metric: 'workflows',
      current: 80,
      limit: 100,
      remaining: 20,
      type: 'hard',
    });

    await guard.canActivate(mockContext);

    expect(mockResponse.header).toHaveBeenCalledWith(
      'X-Limit-Warning',
      'workflows: 80/100',
    );
  });

  it('does not set warning header below 80% usage', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('workflows');
    mockPlanLimitsService.checkLimit.mockResolvedValue({
      allowed: true,
      metric: 'workflows',
      current: 30,
      limit: 100,
      remaining: 70,
      type: 'hard',
    });

    await guard.canActivate(mockContext);

    expect(mockResponse.header).not.toHaveBeenCalled();
  });
});
