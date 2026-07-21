import { normalizeRoute, RouteNormalizationMiddleware } from '../logging/route-normalization.middleware';

describe('normalizeRoute', () => {
  it('MUST replace UUIDs with :param', () => {
    const result = normalizeRoute('/workflows/550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBe('/workflows/:param');
  });

  it('MUST replace numeric IDs with :param', () => {
    const result = normalizeRoute('/api/v1/tenants/42');
    expect(result).toBe('/api/v1/tenants/:param');
  });

  it('MUST replace hex ObjectIds with :param', () => {
    const result = normalizeRoute('/documents/507f1f77bcf86cd799439011');
    expect(result).toBe('/documents/:param');
  });

  it('MUST NOT change paths without parameters', () => {
    const result = normalizeRoute('/api/v1/health');
    expect(result).toBe('/api/v1/health');
  });

  it('MUST NOT change static nested paths', () => {
    const result = normalizeRoute('/api/v1/tenants/list');
    expect(result).toBe('/api/v1/tenants/list');
  });

  it('MUST normalize multiple parameter segments', () => {
    const result = normalizeRoute('/api/v1/tenants/42/workflows/550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBe('/api/v1/tenants/:param/workflows/:param');
  });
});

describe('RouteNormalizationMiddleware', () => {
  let middleware: RouteNormalizationMiddleware;

  beforeEach(() => {
    middleware = new RouteNormalizationMiddleware();
  });

  it('MUST set normalizedRoute on request with UUID path', () => {
    const req = {
      originalUrl: '/workflows/550e8400-e29b-41d4-a716-446655440000',
    } as any;
    const res = {} as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.normalizedRoute).toBe('/workflows/:param');
    expect(next).toHaveBeenCalled();
  });

  it('MUST set normalizedRoute on request with numeric path', () => {
    const req = {
      originalUrl: '/api/v1/tenants/42',
    } as any;
    const res = {} as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.normalizedRoute).toBe('/api/v1/tenants/:param');
    expect(next).toHaveBeenCalled();
  });

  it('MUST keep static paths unchanged', () => {
    const req = {
      originalUrl: '/api/v1/health',
    } as any;
    const res = {} as any;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.normalizedRoute).toBe('/api/v1/health');
    expect(next).toHaveBeenCalled();
  });
});
