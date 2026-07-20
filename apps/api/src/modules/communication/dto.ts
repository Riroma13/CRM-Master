import { z } from 'zod';

export const SendMessageSchema = z.object({
  channel: z.string().min(1),
  to: z.union([z.string(), z.array(z.string())]),
  subject: z.string().max(500).optional(),
  body: z.string().min(1),
  templateId: z.string().optional(),
  variables: z.record(z.unknown()).optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(2).max(200),
  channel: z.string().min(1),
  subject: z.string().max(500).optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export const TemplateListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  channel: z.string().optional(),
});

export const DeliveryQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  channel: z.string().optional(),
});
