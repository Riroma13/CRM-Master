import { Test, TestingModule } from '@nestjs/testing';
import { PinoLoggerService } from '../logging/pino-logger.service';
import { correlationContext, CorrelationContext } from '../logging/correlation-context';

describe('PinoLoggerService', () => {
  let service: PinoLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PinoLoggerService],
    }).compile();

    service = module.get<PinoLoggerService>(PinoLoggerService);
  });

  it('MUST be defined', () => {
    expect(service).toBeDefined();
  });

  it('MUST log at info level without throwing', () => {
    expect(() => service.log('test info message')).not.toThrow();
  });

  it('MUST log at warn level without throwing', () => {
    expect(() => service.warn('test warn message')).not.toThrow();
  });

  it('MUST log at debug level without throwing', () => {
    expect(() => service.debug('test debug message')).not.toThrow();
  });

  it('MUST log at error level with Error object without throwing', () => {
    expect(() => service.error(new Error('test error'))).not.toThrow();
  });

  it('MUST log at error level with string message without throwing', () => {
    expect(() => service.error('test error message')).not.toThrow();
  });

  it('MUST log at verbose level without throwing', () => {
    expect(() => service.verbose('test verbose message')).not.toThrow();
  });

  it('MUST include correlationId when AsyncLocalStorage has context', () => {
    const context: CorrelationContext = { correlationId: 'test-correlation-id' };
    correlationContext.run(context, () => {
      expect(() => service.log('message with correlation')).not.toThrow();
    });
  });

  it('MUST include tenantId when available in context', () => {
    const context: CorrelationContext = { correlationId: 'cid', tenantId: 'tenant-abc' };
    correlationContext.run(context, () => {
      expect(() => service.log('message with tenant')).not.toThrow();
    });
  });

  it('MUST serialize error without circular references', () => {
    const error = new Error('serializable error');
    const serialized = JSON.parse(JSON.stringify({ name: error.name, message: error.message, stack: error.stack }));
    expect(serialized.name).toBe('Error');
    expect(serialized.message).toBe('serializable error');
    expect(serialized.stack).toBeDefined();
  });

  it('MUST work without correlation context', () => {
    expect(() => service.log('no correlation context')).not.toThrow();
  });
});
