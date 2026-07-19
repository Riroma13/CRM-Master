import { z } from 'zod';
import { Severity, Category } from '../../../../../packages/shared/src/activity-timeline';
import { Prisma } from '@prisma/client';

export interface ActivityEventRow {
  id: number;
  tenantId: string;
  clienteId: string | null;
  entityType: string;
  entityId: string | null;
  eventType: string;
  actor: string;
  sourceModule: string;
  severity: string;
  category: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
}

export const TimelineQuerySchema = z.object({
  tenantId: z.string(),
  clienteId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actor: z.string().optional(),
  sourceModule: z.string().optional(),
  severity: Severity.optional(),
  category: Category.optional(),
  eventType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

export type TimelineQuery = z.infer<typeof TimelineQuerySchema>;

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
