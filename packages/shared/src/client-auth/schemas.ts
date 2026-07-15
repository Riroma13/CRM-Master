import { z } from 'zod';

export const ClientLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const ClientUserSchema = z.object({
  id: z.string(),
  clienteId: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ClientUserResponse = ClientUserSchema.omit({ passwordHash: true }).strict();

export const MeResponse = z.object({
  clientUser: ClientUserResponse,
  cliente: z.object({
    id: z.string(),
    tenantId: z.string(),
    nombre: z.string(),
  }),
});
