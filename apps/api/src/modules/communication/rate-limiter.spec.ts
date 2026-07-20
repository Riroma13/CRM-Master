import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => { limiter = new RateLimiter(); });

  it('should allow first request', () => {
    expect(limiter.isAllowed('tenant-1', 'sendgrid')).toBe(true);
  });

  it('should block after limit exceeded', () => {
    for (let i = 0; i < 100; i++) limiter.isAllowed('tenant-1', 'sendgrid');
    expect(limiter.isAllowed('tenant-1', 'sendgrid')).toBe(false);
  });

  it('should track remaining', () => {
    expect(limiter.getRemaining('tenant-1', 'sendgrid')).toBe(100);
    limiter.isAllowed('tenant-1', 'sendgrid');
    expect(limiter.getRemaining('tenant-1', 'sendgrid')).toBe(99);
  });

  it('should isolate keys by tenant and provider', () => {
    limiter.isAllowed('tenant-1', 'sendgrid');
    expect(limiter.isAllowed('tenant-2', 'sendgrid')).toBe(true);
    expect(limiter.isAllowed('tenant-1', 'twilio')).toBe(true);
  });
});
