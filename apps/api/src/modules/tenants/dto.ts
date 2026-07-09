import { z } from 'zod';

const RESERVED_SLUGS = [
  'www', 'api', 'admin', 'app', 'mail', 'ftp',
  'crmmaster', 'mission-control', 'help', 'support',
  'docs', 'status', 'billing', 'login', 'signup',
  'staging', 'dev', 'test',
] as const;

export const CreateTenantSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones')
    .refine((s) => !RESERVED_SLUGS.includes(s as any), {
      message: 'Slug reservado para el sistema',
    }),
  name: z.string().min(2).max(200),
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(100).optional(),
  modules: z.array(z.string()).optional(),
});

export const TenantListQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export class CreateTenantDto {
  slug!: string;
  name!: string;
  adminEmail!: string;
  adminName?: string;
  modules?: string[];
}

export class TenantListDto {
  page!: number;
  limit!: number;
  search?: string;
}

export interface TenantResponseDto {
  id: string;
  slug: string;
  name: string;
  status: string;
  admin?: { email: string; name?: string; status: string };
  portalUrl?: string;
  inviteToken?: string;
  sessionToken?: string;
  clientCount?: number;
  health?: string;
  createdAt: string;
}
