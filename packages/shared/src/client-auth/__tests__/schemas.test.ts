import { describe, it, expect } from 'vitest';
import {
  ClientLoginSchema,
  ClientUserResponse,
  MeResponse,
} from '../schemas';

describe('ClientLoginSchema', () => {
  it('accepts valid email and password', () => {
    const result = ClientLoginSchema.safeParse({
      email: 'client@acme.com',
      password: 'securePass123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = ClientLoginSchema.safeParse({
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = ClientLoginSchema.safeParse({
      email: 'not-an-email',
      password: 'securePass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password (< 6 chars)', () => {
    const result = ClientLoginSchema.safeParse({
      email: 'client@acme.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('ClientUserResponse', () => {
  const validPayload = {
    id: 'cuid123',
    clienteId: 'uuid-cliente',
    tenantId: 'uuid-tenant',
    email: 'client@acme.com',
    isActive: true,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-06-01').toISOString(),
  };

  it('accepts valid client user payload', () => {
    const result = ClientUserResponse.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('requires id field', () => {
    const { id, ...rest } = validPayload;
    const result = ClientUserResponse.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects payload containing passwordHash', () => {
    const result = ClientUserResponse.safeParse({
      ...validPayload,
      passwordHash: 'should-not-exist',
    });
    expect(result.success).toBe(false);
  });

  it('coerces date strings to Date', () => {
    const result = ClientUserResponse.safeParse(validPayload);
    expect(result.success).toBe(true);
  });
});

describe('MeResponse', () => {
  const validPayload = {
    clientUser: {
      id: 'cuid123',
      clienteId: 'uuid-cliente',
      tenantId: 'uuid-tenant',
      email: 'client@acme.com',
      isActive: true,
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date('2026-06-01').toISOString(),
    },
    cliente: {
      id: 'uuid-cliente',
      tenantId: 'uuid-tenant',
      nombre: 'Acme Corp',
    },
  };

  it('accepts valid /me response shape', () => {
    const result = MeResponse.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects missing clientUser', () => {
    const { clientUser, ...rest } = validPayload;
    const result = MeResponse.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing cliente', () => {
    const { cliente, ...rest } = validPayload;
    const result = MeResponse.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects clientUser containing passwordHash', () => {
    const result = MeResponse.safeParse({
      ...validPayload,
      clientUser: {
        ...validPayload.clientUser,
        passwordHash: 'should-not-exist',
      },
    });
    expect(result.success).toBe(false);
  });
});
