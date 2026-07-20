import { EmailSanitizer } from '../email-sanitizer';

describe('EmailSanitizer', () => {
  const sanitizer = new EmailSanitizer();

  it('should remove script tags', () => {
    expect(sanitizer.sanitize('email', 'Hello <script>alert(1)</script>').trim()).toBe('Hello');
  });

  it('should remove onclick handlers', () => {
    expect(sanitizer.sanitize('email', '<p onclick="alert(1)">Text</p>')).toBe('<p>Text</p>');
  });

  it('should keep basic HTML', () => {
    const result = sanitizer.sanitize('email', '<p><strong>Title</strong></p>');
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
  });

  it('should detect un-sanitized content via validate', () => {
    expect(sanitizer.validate('email', 'Hello <script>alert(1)</script>')).toBe(false);
  });
});
