import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { correlationContext, CorrelationContext } from './correlation-context';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    const context: CorrelationContext = {
      correlationId,
      tenantId: (req as any).tenantId,
    };

    correlationContext.run(context, () => {
      const start = Date.now();
      const { method, originalUrl } = req;

      res.on('finish', () => {
        const durationMs = Date.now() - start;
        this.logger.log({
          method,
          url: originalUrl,
          statusCode: res.statusCode,
          durationMs,
          correlationId,
          tenantId: context.tenantId,
        });
      });

      next();
    });
  }
}
