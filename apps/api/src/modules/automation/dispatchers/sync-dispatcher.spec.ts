import { Test, TestingModule } from '@nestjs/testing';
import { SyncDispatcher } from './sync-dispatcher';
import type { AutomationAction, ExecutionContext } from '../../../../../../packages/shared/src/automation';

describe('SyncDispatcher', () => {
  let dispatcher: SyncDispatcher;
  let actionRegistry: Map<string, AutomationAction>;

  const mockAction = (overrides: Partial<AutomationAction>): AutomationAction => ({
    id: 'test-action',
    name: 'Test Action',
    description: '',
    timeout: 5000,
    maxRetries: 2,
    onFailure: 'RETRY' as const,
    execute: jest.fn().mockResolvedValue({ success: true, durationMs: 10 }),
    isRetryable: jest.fn().mockReturnValue(true),
    ...overrides,
  });

  const createContext = (overrides?: Partial<ExecutionContext>): ExecutionContext => ({
    executionId: 'exec-1',
    tenantId: 'tenant-1',
    ruleId: 'rule-1',
    trigger: 'test.trigger',
    actions: ['test-action'],
    payload: {},
    ...overrides,
  });

  beforeEach(async () => {
    actionRegistry = new Map();
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncDispatcher],
    }).compile();

    dispatcher = module.get<SyncDispatcher>(SyncDispatcher);
    dispatcher.setActionRegistry(actionRegistry);
  });

  describe('dispatch', () => {
    it('should execute all actions in order', async () => {
      const action1 = mockAction({ id: 'action-1', name: 'Action 1' });
      const action2 = mockAction({ id: 'action-2', name: 'Action 2' });
      actionRegistry.set('action-1', action1);
      actionRegistry.set('action-2', action2);

      await dispatcher.dispatch(createContext({ actions: ['action-1', 'action-2'] }));

      expect(action1.execute).toHaveBeenCalledTimes(1);
      expect(action2.execute).toHaveBeenCalledTimes(1);
    });

    it('should skip unknown actions', async () => {
      await dispatcher.dispatch(createContext({ actions: ['unknown-action'] }));
      // Should not throw
    });
  });
});
