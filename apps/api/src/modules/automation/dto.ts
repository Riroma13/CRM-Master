import { z } from 'zod';

export const CreateRuleSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  trigger: z.string().min(1),
  actions: z.array(z.string()).min(1).max(20),
  filters: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});

export const UpdateRuleSchema = CreateRuleSchema.partial();

export const RuleListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  trigger: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const ExecutionQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ruleId: z.string().optional(),
  status: z.string().optional(),
});

export const ManualExecutionSchema = z.object({
  trigger: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
});
