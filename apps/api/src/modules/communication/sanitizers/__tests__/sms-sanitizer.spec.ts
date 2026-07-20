import { SmsSanitizer } from '../sms-sanitizer';

describe('SmsSanitizer', () => {
  const sanitizer = new SmsSanitizer();

  it('should strip all HTML', () => {
    expect(sanitizer.sanitize('sms', '<p>Hello <strong>World</strong></p>')).toBe('Hello World');
  });

  it('should limit length', () => {
    const long = 'x'.repeat(2000);
    expect(sanitizer.sanitize('sms', long).length).toBe(1600);
  });

  it('should validate acceptable content', () => {
    expect(sanitizer.validate('sms', 'Hello')).toBe(true);
  });
});
