import { z } from 'zod';

export const CreateConnectorSchema = z.object({
  provider: z.string().min(1).max(100),
  name: z.string().min(2).max(200),
  authType: z.enum(['oauth', 'api-key']),
  config: z.record(z.unknown()).optional(),
});

export const UpdateConnectorSchema = CreateConnectorSchema.partial();

export const ExecuteSchema = z.object({
  operation: z.string().min(1),
  input: z.record(z.unknown()).default({}),
});

export const ExecutionQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  dlq: z.coerce.boolean().optional(),
});

export const ScheduleSchema = z.object({
  connectorId: z.string().min(1),
  cronPattern: z.string().min(1),
  operation: z.string().min(1).default('execute'),
  input: z.record(z.unknown()).default({}),
});
