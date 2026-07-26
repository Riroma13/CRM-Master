import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '../../../../..');
const apiPackagePath = resolve(repositoryRoot, 'apps/api/package.json');
const lockfilePath = resolve(repositoryRoot, 'pnpm-lock.yaml');
const configPath = resolve(repositoryRoot, 'apps/api/scripts/better-auth-schema.config.ts');
const generatedSchemaPath = resolve(
  repositoryRoot,
  'openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma',
);

function generateProviderSchema(): string {
  mkdirSync(resolve(generatedSchemaPath, '..'), { recursive: true });

  const command = '--filter api exec auth generate --cwd . --config scripts/better-auth-schema.config.ts --adapter prisma --dialect postgresql --output ../../openspec/changes/SPEC-0025-identity-platform/evidence/better-auth.generated.prisma --yes';
  execFileSync('pnpm', command.split(' '), {
    cwd: repositoryRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'pipe',
  });

  return readFileSync(generatedSchemaPath, 'utf8');
}

describe('Better-Auth provider schema boundary', () => {
  it('pins the runtime and schema-generation toolchain to 1.6.23', () => {
    const packageJson = JSON.parse(readFileSync(apiPackagePath, 'utf8')) as Record<string, any>;
    const lockfile = readFileSync(lockfilePath, 'utf8');

    expect(packageJson.dependencies['better-auth']).toBe('1.6.23');
    expect(packageJson.dependencies['@better-auth/prisma-adapter']).toBe('1.6.23');
    expect(packageJson.devDependencies.auth).toBe('1.6.23');
    expect(lockfile).toMatch(/\bauth:\n\s+specifier: 1\.6\.23\n/);
    expect(lockfile).toMatch(/\bauth@1\.6\.23:/);
  });

  it('loads the exported CLI config and emits the provider-only artifact', () => {
    const generatedSchema = generateProviderSchema();

    expect(generatedSchema).toContain('model Ba_users');
    expect(generatedSchema).toContain('model Ba_organizations');
    expect(generatedSchema).toContain('active_organization_id');
    expect(generatedSchema).toContain('expires_at');
    expect(generatedSchema).not.toMatch(/^model User\s*\{/m);
  });

  it('keeps provider access behind Better-Auth configuration rather than Prisma table access', () => {
    const authSource = readFileSync(resolve(repositoryRoot, 'apps/api/src/common/auth.ts'), 'utf8');
    const configSource = readFileSync(configPath, 'utf8');

    expect(authSource).not.toMatch(/\bprisma\.(ba_|user|session|account|member|invitation)/);
    expect(authSource).not.toMatch(/\$queryRaw|\$executeRaw/);
    expect(configSource).toContain('export const auth');
    expect(configSource).not.toMatch(/\$queryRaw|\$executeRaw/);
  });
});
