import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '../../../..');
const canonicalSchemaPath = resolve(repositoryRoot, 'packages/database/prisma/schema.prisma');
const generatedSchemaPath = resolve(
  repositoryRoot,
  'openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma',
);

const providerModels = [
  ['Ba_users', 'ba_users', 'id:String name:String email:String emailVerified:Boolean image:String? createdAt:DateTime updatedAt:DateTime'],
  ['Ba_sessions', 'ba_sessions', 'id:String expires_at:DateTime token:String created_at:DateTime updated_at:DateTime ipAddress:String? userAgent:String? user_id:String active_organization_id:String?'],
  ['Ba_accounts', 'ba_accounts', 'id:String account_id:String provider_id:String user_id:String access_token:String? refresh_token:String? id_token:String? access_token_expires_at:DateTime? refresh_token_expires_at:DateTime? scope:String? password:String? createdAt:DateTime updatedAt:DateTime'],
  ['Ba_verifications', 'ba_verifications', 'id:String identifier:String value:String expires_at:DateTime created_at:DateTime updated_at:DateTime'],
  ['Ba_organizations', 'ba_organizations', 'id:String name:String slug:String logo:String? createdAt:DateTime metadata:String?'],
  ['Ba_members', 'ba_members', 'id:String organization_id:String user_id:String role:String createdAt:DateTime'],
  ['Ba_invitations', 'ba_invitations', 'id:String organization_id:String email:String role:String? status:String expires_at:DateTime createdAt:DateTime inviter_id:String'],
] as const;

function readModel(schema: string, modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{([\\s\\S]*?)\\n\\}`));
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

function mappedTables(schema: string): string[] {
  return [...schema.matchAll(/@@map\("(ba_[^"]+)"\)/g)].map(match => match[1]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('Better-Auth generated provider schema reconciliation', () => {
  it('uses collision-free model names and one-to-one ba_* physical mappings', () => {
    const canonicalSchema = readFileSync(canonicalSchemaPath, 'utf8');
    const generatedSchema = readFileSync(generatedSchemaPath, 'utf8');

    for (const [name, table, fieldContract] of providerModels) {
      const canonicalModel = readModel(canonicalSchema, name);
      const generatedModel = readModel(generatedSchema, name);

      expect(canonicalModel).toContain(`@@map("${table}")`);
      expect(generatedModel).toContain(`@@map("${table}")`);

      for (const contract of fieldContract.split(' ')) {
        const [field, type] = contract.split(':');
        const declaration = new RegExp(
          `^\\s+${escapeRegExp(field)}\\s+${escapeRegExp(type)}(?:\\s|$)`,
          'm',
        );

        expect(canonicalModel).toMatch(declaration);
        expect(generatedModel).toMatch(declaration);
      }
    }

    expect(generatedSchema).not.toMatch(/^model (User|Organization|Member|Invitation)\s*\{/m);
    expect(new Set(mappedTables(generatedSchema)).size).toBe(providerModels.length);
    expect(mappedTables(canonicalSchema)).toEqual(
      expect.arrayContaining(providerModels.map(([, table]) => table)),
    );
  });

  it('reconciles organization invitation expiry and active session state', () => {
    const canonicalSchema = readFileSync(canonicalSchemaPath, 'utf8');
    const generatedSchema = readFileSync(generatedSchemaPath, 'utf8');
    const canonicalSession = readModel(canonicalSchema, 'Ba_sessions');
    const generatedSession = readModel(generatedSchema, 'Ba_sessions');
    const canonicalInvitation = readModel(canonicalSchema, 'Ba_invitations');
    const generatedInvitation = readModel(generatedSchema, 'Ba_invitations');

    expect(canonicalSession).toMatch(/^\s+active_organization_id\s+String\?/m);
    expect(generatedSession).toMatch(/^\s+active_organization_id\s+String\?/m);
    expect(canonicalInvitation).toMatch(/^\s+expires_at\s+DateTime\s/m);
    expect(generatedInvitation).toMatch(/^\s+expires_at\s+DateTime\s/m);
  });
});
