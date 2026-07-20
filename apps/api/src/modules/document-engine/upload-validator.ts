import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024; // 25MB
const DEFAULT_MIME_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Magic bytes for common formats
const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
  'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
  'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
};

@Injectable()
export class UploadValidator {
  private readonly logger = new Logger(UploadValidator.name);

  validate(file: Buffer, fileName: string, mimeType: string, maxSize?: number, allowedMimeTypes?: string[]): void {
    const sizeLimit = maxSize ?? DEFAULT_MAX_SIZE;
    const allowedTypes = allowedMimeTypes ?? DEFAULT_MIME_TYPES;

    if (file.length > sizeLimit) {
      throw new Error(`File exceeds maximum size of ${sizeLimit / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`MIME type "${mimeType}" is not allowed`);
    }

    const magic = MAGIC_BYTES[mimeType];
    if (magic) {
      const matches = magic.some((bytes) => bytes.every((b, i) => file[i] === b));
      if (!matches) {
        throw new Error(`File content does not match declared MIME type "${mimeType}"`);
      }
    }
  }
}
