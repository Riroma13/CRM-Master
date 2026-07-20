import { UploadValidator } from './upload-validator';

describe('UploadValidator', () => {
  const validator = new UploadValidator();

  it('should accept valid PDF file', () => {
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x00]);
    expect(() => validator.validate(pdfBuffer, 'test.pdf', 'application/pdf')).not.toThrow();
  });

  it('should reject file exceeding max size', () => {
    const large = Buffer.alloc(30 * 1024 * 1024);
    expect(() => validator.validate(large, 'large.pdf', 'application/pdf')).toThrow();
  });

  it('should reject disallowed MIME type', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    expect(() => validator.validate(buf, 'test.exe', 'application/x-msdownload')).toThrow();
  });

  it('should reject mismatched magic bytes', () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    expect(() => validator.validate(buf, 'fake.pdf', 'application/pdf')).toThrow();
  });
});
