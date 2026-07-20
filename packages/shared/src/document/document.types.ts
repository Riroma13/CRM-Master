export type DocumentStatus = 'scanning' | 'stored' | 'quarantined' | 'deleted';

export interface DocumentMetadata {
  documentId: string;
  versionId: string;
  tenantId: string;
  folderId?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  hash: string;
  tags: string[];
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  createdBy: string;
  createdAt: string;
}

export interface FolderNode {
  id: string;
  tenantId: string;
  parentId?: string;
  name: string;
  path: string;
  documentCount: number;
}

export interface UploadLimits {
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  validateMagicBytes: boolean;
}

export interface DocumentEvent {
  eventType: 'uploaded' | 'deleted' | 'versioned' | 'quarantined';
  documentId: string;
  tenantId: string;
  folderId?: string;
  name: string;
  occurredAt: string;
}
