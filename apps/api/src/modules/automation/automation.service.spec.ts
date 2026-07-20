import { Test, TestingModule } from '@nestjs/testing';
import { AutomationEngine } from './automation.service';
import { SyncDispatcher } from './dispatchers/sync-dispatcher';

describe('AutomationEngine', () => {
  let engine: AutomationEngine;
  let mockDispatcher: any;

  beforeEach(async () => {
    mockDispatcher = { dispatch: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationEngine,
        { provide: SyncDispatcher, useValue: mockDispatcher },
      ],
    }).compile();

    engine = module.get<AutomationEngine>(AutomationEngine);
  });

  describe('canExecute', () => {
    it('should allow execution when under concurrency limit', () => {
      expect(engine.canExecute('tenant-1')).toBe(true);
    });
  });

  describe('evaluate', () => {
    it('should dispatch for known trigger events', async () => {
      await engine.evaluate('cliente.creado', 'tenant-1', { nombre: 'Test' });
      expect(mockDispatcher.dispatch).toHaveBeenCalled();
    });

    it('should not dispatch for unknown events', async () => {
      await engine.evaluate('unknown.event', 'tenant-1', {});
      expect(mockDispatcher.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('getConcurrency', () => {
    it('should return 0 for unknown tenants', () => {
      expect(engine.getConcurrency('unknown')).toBe(0);
    });
  });
});
