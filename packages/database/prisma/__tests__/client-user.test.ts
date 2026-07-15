import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const schemaPath = resolve(__dirname, '../schema.prisma');
const schema = readFileSync(schemaPath, 'utf-8');

describe('ClientUser model', () => {
  it('declares ClientUser model with required fields', () => {
    expect(schema).toContain('model ClientUser {');
    expect(schema).toContain('String   @id @default(cuid())');
    expect(schema).toContain('clienteId    String');
    expect(schema).toContain('tenantId     String');
    expect(schema).toContain('email        String   @unique');
    expect(schema).toContain('passwordHash String');
    expect(schema).toContain('isActive     Boolean  @default(true)');
    expect(schema).toContain('createdAt    DateTime @default(now())');
    expect(schema).toContain('updatedAt    DateTime @updatedAt');
  });

  it('declares FK relation to Cliente with cascade delete', () => {
    expect(schema).toContain('cliente Cliente @relation(fields: [clienteId], references: [id], onDelete: Cascade)');
  });

  it('declares FK relation to Tenant with cascade delete', () => {
    expect(schema).toContain('tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)');
  });

  it('enforces @@unique([tenantId, email]) constraint', () => {
    expect(schema).toContain('@@unique([tenantId, email])');
  });

  it('maps to table name client_users', () => {
    expect(schema).toContain('@@map("client_users")');
  });
});
