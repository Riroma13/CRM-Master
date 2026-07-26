import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HttpException } from '@nestjs/common';
import {
  PlanFeatureGuard,
} from '../feature-flags/plan-feature.guard';
import {
  PLAN_FEATURE_KEY,
} from '../feature-flags/plan-feature.decorator';
import { FeatureFlagService } from '../feature-flags/feature-flags.service';

describe('PlanFeatureGuard', () => {
  let guard: PlanFeatureGuard;
  let mockFeatureFlagService: jest.Mocked<FeatureFlagService>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockRequest: any;
  let mockContext: any;

  beforeAll(async () => {
    mockFeatureFlagService = {
      isEnabled: jest.fn(),
      getAllEnabled: jest.fn(),
      invalidateCache: jest.fn(),
      handlePlanChanged: jest.fn(),
    } as any;

    mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanFeatureGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: FeatureFlagService, useValue: mockFeatureFlagService },
      ],
    }).compile();

    guard = module.get(PlanFeatureGuard);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      tenantId: 'tenant-001',
    };
    mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    };
  });

  it('allows request when no decorator is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockFeatureFlagService.isEnabled).not.toHaveBeenCalled();
  });

  it('allows request when feature is enabled', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('audit-logs');
    mockFeatureFlagService.isEnabled.mockResolvedValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith(
      'tenant-001',
      'audit-logs',
    );
  });

  it('throws 403 when feature is not available', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('audit-logs');
    mockFeatureFlagService.isEnabled.mockResolvedValue(false);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);

    try {
      await guard.canActivate(mockContext);
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.getResponse()).toEqual({
        error: 'feature_not_available',
        feature: 'audit-logs',
      });
    }
  });

  it('returns true when no tenantId is available', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('audit-logs');
    mockRequest.tenantId = undefined;

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockFeatureFlagService.isEnabled).not.toHaveBeenCalled();
  });

  it('returns true when tenantId is on user object but not request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('audit-logs');
    mockRequest.tenantId = undefined;
    mockRequest.user = { tenantId: 'tenant-002' };
    mockFeatureFlagService.isEnabled.mockResolvedValue(true);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockFeatureFlagService.isEnabled).toHaveBeenCalledWith(
      'tenant-002',
      'audit-logs',
    );
  });

  it('throws 403 for expired subscription', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('documents');
    mockFeatureFlagService.isEnabled.mockResolvedValue(false);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);

    try {
      await guard.canActivate(mockContext);
    } catch (e: any) {
      expect(e.getStatus()).toBe(403);
      expect(e.getResponse()).toEqual({
        error: 'feature_not_available',
        feature: 'documents',
      });
    }
  });
});
