import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { correlationContext } from './correlation-context';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      serializers: {
        err: pino.stdSerializers.err,
      },
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' }
          : undefined,
    });
  }

  private getBaseBindings(context?: string) {
    const ctx = correlationContext.getStore();
    return {
      correlationId: ctx?.correlationId,
      tenantId: ctx?.tenantId,
      module: context,
    };
  }

  log(message: any, context?: string) {
    this.logger.info(this.getBaseBindings(context), message);
  }

  error(message: any, stack?: string, context?: string) {
    const bindings = this.getBaseBindings(context);
    if (message instanceof Error) {
      this.logger.error({ ...bindings, err: message }, message.message);
    } else {
      this.logger.error({ ...bindings, stack }, message);
    }
  }

  warn(message: any, context?: string) {
    this.logger.warn(this.getBaseBindings(context), message);
  }

  debug(message: any, context?: string) {
    this.logger.debug(this.getBaseBindings(context), message);
  }

  verbose(message: any, context?: string) {
    this.logger.trace(this.getBaseBindings(context), message);
  }
}
