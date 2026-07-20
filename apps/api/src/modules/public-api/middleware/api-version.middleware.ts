import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface VersionConfig {
  status: 'active' | 'deprecated' | 'sunset';
  deprecationDate?: string;
  sunsetDate?: string;
  successorVersion?: string;
}

const VERSION_CONFIGS: Record<string, VersionConfig> = {
  v1: {
    status: 'active',
    successorVersion: 'v2',
  },
  v2: {
    status: 'active',
  },
};

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const match = req.path.match(/^\/api\/(v\d+)\//);
    if (!match) {
      next();
      return;
    }

    const version = match[1];
    res.setHeader('X-API-Version', version);

    const config = VERSION_CONFIGS[version];
    if (config) {
      if (config.status === 'deprecated' && config.deprecationDate && config.successorVersion) {
        res.setHeader(
          'Warning',
          `299 - "This API version will be removed on ${config.deprecationDate}. Use /api/${config.successorVersion}/public/ instead."`,
        );
      }

      if (config.status === 'sunset' && config.sunsetDate) {
        res.setHeader('Sunset', config.sunsetDate);
      }
    }

    next();
  }
}
