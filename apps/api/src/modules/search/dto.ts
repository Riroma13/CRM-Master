import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200).transform((s) => s.trim()),
  type: z.string().optional(),
  tenantId: z.string().min(1, 'tenantId is required'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchQueryDto = z.infer<typeof SearchQuerySchema>;
