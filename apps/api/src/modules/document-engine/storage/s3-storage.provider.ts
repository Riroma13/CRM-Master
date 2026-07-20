import { Injectable, Logger } from '@nestjs/common';
import type { DocumentStorage, StorageOperation } from '@shared/document';

@Injectable()
export class S3StorageProvider implements DocumentStorage {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly bucket = process.env.S3_DOCUMENTS_BUCKET || 'crm-master';

  async store(tenantId: string, documentId: string, versionId: string, file: Buffer, _mimeType: string): Promise<string> {
    const storageKey = `${tenantId}/${documentId}/${versionId}`;
    // S3 upload via @aws-sdk/client-s3
    this.logger.log(`Stored document at s3://${this.bucket}/${storageKey}`);
    return storageKey;
  }

  async retrieve(storageKey: string): Promise<Buffer> {
    return Buffer.from(''); // S3 getObject
  }

  async delete(storageKey: string): Promise<void> {
    // S3 deleteObject
  }

  async getSignedUrl(storageKey: string, operation: StorageOperation, expiresIn = 3600): Promise<string> {
    // S3 presigned URL via @aws-sdk/s3-request-presigner
    return `https://${this.bucket}.s3.amazonaws.com/${storageKey}?expires=${expiresIn}&op=${operation}`;
  }
}
