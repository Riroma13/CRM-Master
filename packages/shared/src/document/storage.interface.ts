export type StorageOperation = 'READ' | 'WRITE' | 'DELETE';

export interface DocumentStorage {
  store(tenantId: string, documentId: string, versionId: string, file: Buffer, mimeType: string): Promise<string>;
  retrieve(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
  getSignedUrl(storageKey: string, operation: StorageOperation, expiresIn?: number): Promise<string>;
}
