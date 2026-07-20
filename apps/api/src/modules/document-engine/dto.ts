import { z } from 'zod';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const UploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
  folderId: z.string().uuid().optional(),
});

export const DocumentQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.string().uuid().optional(),
  status: z.string().optional(),
});

export const VersionListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
