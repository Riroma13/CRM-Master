import { Test, TestingModule } from '@nestjs/testing';
import { SendEmailAction } from '../send-email.action';

describe('SendEmailAction', () => {
  let action: SendEmailAction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SendEmailAction],
    }).compile();
    action = module.get<SendEmailAction>(SendEmailAction);
  });

  it('should have correct configuration', () => {
    expect(action.id).toBe('send-email');
    expect(action.timeout).toBe(15000);
    expect(action.maxRetries).toBe(3);
    expect(action.onFailure).toBe('RETRY');
  });

  it('should classify retryable errors', () => {
    expect(action.isRetryable(new Error('Connection timeout'))).toBe(true);
    expect(action.isRetryable(new Error('ECONNREFUSED'))).toBe(true);
    expect(action.isRetryable(new Error('Invalid credentials'))).toBe(false);
  });

  it('should execute successfully', async () => {
    const result = await action.execute({
      executionId: 'e1', stepId: 's1', tenantId: 't1', trigger: 'test', payload: {}, metadata: {},
    });
    expect(result.success).toBe(true);
  });
});
