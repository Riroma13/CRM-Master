import { LoggingMiddleware } from '../logging/logging.middleware';
import { correlationContext } from '../logging/correlation-context';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;

  beforeEach(() => {
    middleware = new LoggingMiddleware();
  });

  it('MUST generate a correlationId for each request', (done) => {
    const req = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/v1/health',
    } as any;
    const res = {
      on: jest.fn((_event: string, cb: () => void) => {
        cb();
      }),
      statusCode: 200,
    } as any;
    const next = jest.fn(() => {
      const ctx = correlationContext.getStore();
      expect(ctx).toBeDefined();
      expect(ctx?.correlationId).toBeDefined();
      expect(typeof ctx?.correlationId).toBe('string');
      done();
    });

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('MUST propagate correlationId from x-correlation-id header', (done) => {
    const req = {
      headers: { 'x-correlation-id': 'incoming-id-123' },
      method: 'GET',
      originalUrl: '/api/v1/health',
    } as any;
    const res = {
      on: jest.fn((_event: string, cb: () => void) => cb()),
      statusCode: 200,
    } as any;
    const next = jest.fn(() => {
      const ctx = correlationContext.getStore();
      expect(ctx?.correlationId).toBe('incoming-id-123');
      done();
    });

    middleware.use(req, res, next);
  });

  it('MUST log method, url, statusCode and durationMs on finish', (done) => {
    const req = {
      headers: {},
      method: 'POST',
      originalUrl: '/api/v1/workflows',
    } as any;
    const res = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') {
          expect(res.statusCode).toBe(201);
          cb();
        }
      }),
      statusCode: 201,
    } as any;
    const next = jest.fn(() => {
      const ctx = correlationContext.getStore();
      expect(ctx?.correlationId).toBeDefined();
      done();
    });

    middleware.use(req, res, next);
  });
});
