import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { TenantResolveMiddleware } from './tenant-resolve.middleware';
import { PrismaService } from '../prisma.service';

describe('TenantResolveMiddleware', () => {
  let middleware: TenantResolveMiddleware;
  let prisma: jest.Mocked<Pick<PrismaService, 'admin'>>;

  const mockNext = jest.fn();

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    mockNext.mockReset();
    prisma = {
      admin: {
        tenant: {
          findUnique: jest.fn(),
        },
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantResolveMiddleware,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    middleware = module.get<TenantResolveMiddleware>(TenantResolveMiddleware);
  });

  describe('slug extraction', () => {
    it('should resolve tenantId from valid subdomain', async () => {
      const req = { headers: { host: 'acme.crmmaster.com' } } as any;
      (prisma.admin.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-1',
        isActive: true,
      });

      await middleware.use(req, {} as any, mockNext);

      expect(req.tenantId).toBe('tenant-1');
      expect(req.tenantSlug).toBe('acme');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache behavior', () => {
    it('should query DB on cache miss and cache the result', async () => {
      const req = { headers: { host: 'acme.crmmaster.com' } } as any;
      (prisma.admin.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-1',
        isActive: true,
      });

      await middleware.use(req, {} as any, mockNext);

      expect(prisma.admin.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'acme' },
      });
      expect(req.tenantId).toBe('tenant-1');
    });

    it('should use cached value on subsequent requests without DB query', async () => {
      // First request — cache miss
      const req1 = { headers: { host: 'acme.crmmaster.com' } } as any;
      (prisma.admin.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-1',
        isActive: true,
      });
      await middleware.use(req1, {} as any, mockNext);
      expect(prisma.admin.tenant.findUnique).toHaveBeenCalledTimes(1);

      // Second request — cache hit
      const req2 = { headers: { host: 'acme.crmmaster.com' } } as any;
      await middleware.use(req2, {} as any, mockNext);

      expect(prisma.admin.tenant.findUnique).toHaveBeenCalledTimes(1); // no additional DB call
      expect(req2.tenantId).toBe('tenant-1');
    });
  });

  describe('unknown slug', () => {
    it('should throw HttpException 404 when slug is not found', async () => {
      const req = { headers: { host: 'ghost.crmmaster.com' } } as any;
      (prisma.admin.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        middleware.use(req, {} as any, mockNext),
      ).rejects.toThrow(HttpException);

      await expect(
        middleware.use(req, {} as any, mockNext),
      ).rejects.toThrow(/not found/i);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('reserved / admin slugs', () => {
    it.each([
      ['www.crmmaster.com'],
      ['admin.crmmaster.com'],
      ['api.crmmaster.com'],
      ['app.crmmaster.com'],
      ['mail.crmmaster.com'],
    ])(
      'should set isAdminRequest for reserved slug %s',
      async (host) => {
        const req = { headers: { host } } as any;

        await middleware.use(req, {} as any, mockNext);

        expect((req as any).isAdminRequest).toBe(true);
        expect((req as any).tenantId).toBeUndefined();
        expect(mockNext).toHaveBeenCalledTimes(1);
      },
    );

    it('should set isAdminRequest when there is no subdomain', async () => {
      const req = { headers: { host: 'crmmaster.com' } } as any;

      await middleware.use(req, {} as any, mockNext);

      expect((req as any).isAdminRequest).toBe(true);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set isAdminRequest when host is localhost', async () => {
      const req = { headers: { host: 'localhost:3000' } } as any;

      await middleware.use(req, {} as any, mockNext);

      expect((req as any).isAdminRequest).toBe(true);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateCache', () => {
    it('should remove cached entry and force a new DB query', async () => {
      // First request — cache miss, DB query
      const req1 = { headers: { host: 'acme.crmmaster.com' } } as any;
      (prisma.admin.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-1',
        isActive: true,
      });
      await middleware.use(req1, {} as any, mockNext);
      expect(prisma.admin.tenant.findUnique).toHaveBeenCalledTimes(1);

      // Invalidate
      middleware.invalidateCache('acme');

      // Second request — cache was cleared, DB query again
      const req2 = { headers: { host: 'acme.crmmaster.com' } } as any;
      await middleware.use(req2, {} as any, mockNext);
      expect(prisma.admin.tenant.findUnique).toHaveBeenCalledTimes(2);
      expect(req2.tenantId).toBe('tenant-1');
    });
  });

  describe('Host authority', () => {
    it.each([
      ['malformed host', 'ACME.crmmaster.com'],
      ['multiple Host values', ['acme.crmmaster.com', 'other.crmmaster.com']],
    ])('rejects %s before resolving a tenant', async (_case, host) => {
      const req = { headers: { host } } as any;

      await expect(middleware.use(req, {} as any, mockNext)).rejects.toMatchObject({
        status: 400,
      });

      expect(prisma.admin.tenant.findUnique).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('rejects an untrusted proxy-conflicting host', async () => {
      const req = {
        headers: {
          host: 'acme.crmmaster.com',
          'x-forwarded-host': 'other.crmmaster.com',
        },
      } as any;

      await expect(middleware.use(req, {} as any, mockNext)).rejects.toMatchObject({
        status: 400,
      });
      expect(prisma.admin.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('sets immutable Host-derived context without replacing hostTenantId', async () => {
      const req = {
        headers: { host: 'acme.crmmaster.com' },
        hostTenantId: 'tenant-1',
        hostTenantSlug: 'acme',
      } as any;
      (prisma.admin.tenant.findUnique as jest.Mock).mockResolvedValue({
        id: 'tenant-1',
        isActive: true,
      });

      await middleware.use(req, {} as any, mockNext);

      expect(req.hostTenantId).toBe('tenant-1');
      expect(req.hostTenantSlug).toBe('acme');
      expect(req.tenantId).toBe('tenant-1');
    });
  });
});
