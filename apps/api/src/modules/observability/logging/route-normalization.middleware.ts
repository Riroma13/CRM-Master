import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const PARAM_PATTERN = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\/[0-9a-f]{24}|\/\d+/gi;

export function normalizeRoute(path: string): string {
  return path.replace(PARAM_PATTERN, '/:param');
}

@Injectable()
export class RouteNormalizationMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const originalUrl = req.originalUrl || req.path || '';
    (req as any).normalizedRoute = normalizeRoute(originalUrl);
    next();
  }
}
