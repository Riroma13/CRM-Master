import { WhatsappSanitizer } from '../whatsapp-sanitizer';

describe('WhatsappSanitizer', () => {
  const sanitizer = new WhatsappSanitizer();

  it('should strip all HTML', () => {
    expect(sanitizer.sanitize('whatsapp', '<p>Hello <strong>World</strong></p>')).toBe('Hello World');
  });

  it('should allow markdown formatting', () => {
    expect(sanitizer.sanitize('whatsapp', '*bold* _italic_')).toBe('*bold* _italic_');
  });

  it('should limit length', () => {
    const long = 'x'.repeat(5000);
    expect(sanitizer.sanitize('whatsapp', long).length).toBe(4096);
  });

  it('should validate acceptable content', () => {
    expect(sanitizer.validate('whatsapp', 'Hello')).toBe(true);
  });
});
