import { ApiVersionMiddleware } from '../middleware/api-version.middleware';
import type { Request, Response, NextFunction } from 'express';

describe('ApiVersionMiddleware', () => {
  let middleware: ApiVersionMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    middleware = new ApiVersionMiddleware();
    mockRes = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('version extraction', () => {
    it('should set X-API-Version header for v1 paths', () => {
      mockReq = { path: '/api/v1/public/workflows' };
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set X-API-Version header for v2 paths', () => {
      mockReq = { path: '/api/v2/public/documents' };
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not set version header for non-api paths', () => {
      mockReq = { path: '/health' };
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set version header for internal api paths too', () => {
      mockReq = { path: '/api/v1/internal/api-keys' };
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-API-Version', 'v1');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('deprecation warning', () => {
    it('should NOT add Warning header for active v1 version (not deprecated)', () => {
      mockReq = { path: '/api/v1/public/workflows' };
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      const call = (mockRes.setHeader as jest.Mock).mock.calls.find(
        (c: string[]) => c[0] === 'Warning',
      );
      expect(call).toBeUndefined();
    });
  });

  describe('sunset header', () => {
    it('should NOT add Sunset header for active versions', () => {
      mockReq = { path: '/api/v1/public/workflows' };
      middleware.use(mockReq as Request, mockRes as Response, mockNext);
      const call = (mockRes.setHeader as jest.Mock).mock.calls.find(
        (c: string[]) => c[0] === 'Sunset',
      );
      expect(call).toBeUndefined();
    });
  });
});
