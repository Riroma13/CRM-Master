import { z } from 'zod';

export const CreateAutomationRuleSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  trigger: z.string().min(1),
  actions: z.array(z.string()).min(1).max(20),
  filters: z.record(z.unknown()).optional(),
  config: z.object({
    maxConcurrentExecutions: z.number().int().positive().default(5),
  }).optional(),
  isActive: z.boolean().default(true),
});

export const UpdateAutomationRuleSchema = CreateAutomationRuleSchema.partial();

export interface AutomationRuleDto {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: string;
  actions: string[];
  filters?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
