import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { spawn } from 'node:child_process';

export interface BootstrapRequest {
  confirmFresh: boolean;
  databaseUrl: string;
  postgresMajor: number;
  manifestVersion: number;
}

export interface BootstrapManifestComponent {
  path: string;
  sha256: string;
  transaction: 'required' | 'forbidden';
}

export interface BootstrapManifest {
  version: 1;
  postgresMajor: 16;
  components: ReadonlyArray<BootstrapManifestComponent>;
  migrations?: ReadonlyArray<{ name: string; sha256: string }>;
}

export interface BootstrapTarget {
  isMaintenanceDatabase?: boolean;
  userObjectCount: number;
  ledgerCount: number;
  alteredByPreviousAttempt?: boolean;
}

export interface BootstrapDependencies {
  readFile?: (path: string) => Promise<Uint8Array | string>;
  queryTarget: () => Promise<BootstrapTarget & { postgresMajor?: number; databaseName?: string }>;
  executeSql: (sql: string, transaction: 'required' | 'forbidden') => Promise<void>;
  runCommand: (command: string, args: readonly string[]) => Promise<string>;
}

export type BootstrapStage =
  | 'pgvector'
  | 'schema.sql'
  | 'reporting.sql'
  | 'triggers/functions'
  | `resolve:${string}`
  | 'status'
  | 'deploy';

export interface ExecuteBootstrapOptions {
  request: BootstrapRequest;
  target: BootstrapTarget;
  runStage?: (stage: BootstrapStage) => void | Promise<void>;
  migrationDirectories?: readonly string[];
  historicalFiles?: readonly string[];
  readHistoricalFile?: (file: string) => Uint8Array | string | Promise<Uint8Array | string>;
}

const FIXED_COMPONENT_PATH = /^bootstrap\/v1\/[a-z0-9][a-z0-9._/-]*\.sql$/;
const SHA256 = /^[a-f0-9]{64}$/;
const POSTGRES_URL = /^postgres(?:ql)?:\/\//i;
const EXPECTED_COMPONENTS = [
  'bootstrap/v1/components/01-pgvector.sql',
  'bootstrap/v1/schema.sql',
  'bootstrap/v1/reporting.sql',
  'bootstrap/v1/components/04-activity-timeline-trigger.sql',
  'bootstrap/v1/components/05-audit-append-only-trigger.sql',
] as const;

function fail(reason: string): never {
  throw new Error(`fresh bootstrap rejected: ${reason}`);
}

export function validateBootstrapRequest(request: BootstrapRequest): BootstrapRequest {
  if (!request.confirmFresh) fail('explicit confirmation is required');
  if (!request.databaseUrl || !POSTGRES_URL.test(request.databaseUrl)) {
    fail('a PostgreSQL URL and DATABASE_URL are required');
  }
  if (request.postgresMajor !== 16) fail('PostgreSQL 16 is required');
  if (request.manifestVersion !== 1) fail('manifest version 1 is required');

  return {
    confirmFresh: true,
    databaseUrl: request.databaseUrl,
    postgresMajor: 16,
    manifestVersion: 1,
  };
}

export function validateManifest(manifest: BootstrapManifest): BootstrapManifest {
  if (manifest.version !== 1) fail('manifest version 1 is required');
  if (manifest.postgresMajor !== 16) fail('manifest requires PostgreSQL 16');
  if (!Array.isArray(manifest.components) || manifest.components.length === 0) {
    fail('manifest components are required');
  }

  for (const component of manifest.components) {
    if (!FIXED_COMPONENT_PATH.test(component.path) || component.path.includes('..')) {
      fail(`fixed path is required for component ${component.path}`);
    }
    if (!SHA256.test(component.sha256)) fail('SHA-256 digest is required');
    if (component.transaction !== 'required' && component.transaction !== 'forbidden') {
      fail('transaction must be required or forbidden');
    }
  }

  for (const migration of manifest.migrations ?? []) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(migration.name)) fail('invalid migration name');
    if (!SHA256.test(migration.sha256)) fail('SHA-256 digest is required');
  }
  if (manifest.components.length !== EXPECTED_COMPONENTS.length ||
      manifest.components.some((component, index) => component.path !== EXPECTED_COMPONENTS[index])) {
    fail('manifest component order is invalid');
  }
  return manifest;
}

async function digest(value: Uint8Array | string): Promise<string> {
  return createHash('sha256').update(typeof value === 'string' ? Buffer.from(value) : value).digest('hex');
}

export async function verifyManifestAssets(
  manifest: BootstrapManifest,
  read: (path: string) => Promise<Uint8Array | string>,
  expected?: Record<string, string>,
): Promise<true> {
  validateManifest(manifest);
  for (const component of manifest.components) {
    const bytes = expected?.[component.path] ?? await read(component.path);
    if (await digest(bytes) !== component.sha256) fail(`asset digest mismatch: ${component.path}`);
  }
  for (const migration of manifest.migrations ?? []) {
    const path = `prisma/migrations/${migration.name}/migration.sql`;
    const bytes = expected?.[path] ?? await read(path);
    if (await digest(bytes) !== migration.sha256) fail(`migration digest mismatch: ${migration.name}`);
  }
  return true;
}

export function buildPsqlArgs(transaction: boolean): readonly string[] {
  return transaction
    ? ['--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1', '--single-transaction']
    : ['--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1'];
}

export function buildPrismaCommand(action: 'resolve' | 'status' | 'deploy', migration?: string): readonly string[] {
  if (action === 'resolve') {
    if (!migration || !/^[a-z0-9][a-z0-9_-]*$/.test(migration)) fail('invalid migration name');
    return ['migrate', 'resolve', '--applied', migration, '--schema', 'prisma/schema.prisma'];
  }
  return ['migrate', action, '--schema', 'prisma/schema.prisma'];
}

export function fixedHistoricalPaths(manifest: BootstrapManifest): readonly string[] {
  return [
    ...(manifest.migrations ?? []).map(({ name }) => `prisma/migrations/${name}/migration.sql`),
    'prisma/migrations/migration_lock.toml',
  ];
}

function assertTarget(target: BootstrapTarget & { postgresMajor?: number; databaseName?: string }): void {
  if (target.postgresMajor !== 16) fail('PostgreSQL 16 is required');
  if (target.isMaintenanceDatabase || ['postgres', 'template0', 'template1'].includes(target.databaseName ?? '')) {
    fail('maintenance database');
  }
  assertFreshTarget(target);
}

export async function runFreshBootstrap(
  request: BootstrapRequest,
  manifest: BootstrapManifest,
  dependencies: BootstrapDependencies,
): Promise<void> {
  validateBootstrapRequest(request);
  validateManifest(manifest);
  const read = dependencies.readFile ?? (async path => readFile(path));
  await verifyManifestAssets(manifest, read);
  const target = await dependencies.queryTarget();
  assertTarget(target);
  const historicalFiles = fixedHistoricalPaths(manifest);
  const before = await createHistoricalSnapshotsAsync(historicalFiles, read);
  try {
    for (const component of manifest.components) {
      const sql = String(await read(component.path));
      await dependencies.executeSql(sql, component.transaction);
    }
    for (const { name } of [...(manifest.migrations ?? [])].sort((a, b) => a.name.localeCompare(b.name))) {
      await dependencies.runCommand('prisma', buildPrismaCommand('resolve', name));
    }
    await dependencies.runCommand('prisma', buildPrismaCommand('status'));
    await dependencies.runCommand('prisma', buildPrismaCommand('deploy'));
  } finally {
    const after = await createHistoricalSnapshotsAsync(historicalFiles, read);
    assertHistoricalSnapshotsUnchanged(before, after);
  }
}

export function createHistoricalSnapshots(
  files: readonly string[],
  read: (file: string) => Uint8Array | string,
): Map<string, string> {
  return new Map(
    files.map(file => {
      const value = read(file);
      const bytes = typeof value === 'string' ? Buffer.from(value) : value;
      return [file, createHash('sha256').update(bytes).digest('hex')];
    }),
  );
}

export function assertHistoricalSnapshotsUnchanged(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): true {
  if (before.size !== after.size) fail('historical file set mismatch');
  for (const [file, digest] of before) {
    if (after.get(file) !== digest) fail(`historical byte mismatch: ${file}`);
  }
  return true;
}

function assertFreshTarget(target: BootstrapTarget): void {
  if (target.isMaintenanceDatabase) fail('maintenance database');
  if (target.alteredByPreviousAttempt) fail('altered target cannot be retried');
  if (target.userObjectCount > 1) fail('user objects in target');
  if (target.userObjectCount === 1) fail('non-empty database');
  if (target.ledgerCount > 0) fail('ledgered database');
}

export function executeBootstrap(options: ExecuteBootstrapOptions): Promise<void> {
  const request = validateBootstrapRequest(options.request);
  if (options.migrationDirectories?.length) {
    try {
      assertFreshTarget(options.target);
    } catch (error) {
      return Promise.reject(error);
    }
  } else {
    assertFreshTarget(options.target);
  }
  const runStage = options.runStage ?? (() => fail('bootstrap assets are not ready'));
  const migrations = [...(options.migrationDirectories ?? [])].sort((a, b) => a.localeCompare(b));

  void request;
  return (async () => {
    let before: Map<string, string> | undefined;
    if (options.historicalFiles && options.readHistoricalFile) {
      before = await createHistoricalSnapshotsAsync(options.historicalFiles, options.readHistoricalFile);
    }

    await runStage('pgvector');
    await runStage('schema.sql');
    await runStage('reporting.sql');
    await runStage('triggers/functions');
    for (const migration of migrations) await runStage(`resolve:${migration}`);
    await runStage('status');
    await runStage('deploy');

    if (before && options.historicalFiles && options.readHistoricalFile) {
      const after = await createHistoricalSnapshotsAsync(options.historicalFiles, options.readHistoricalFile);
      assertHistoricalSnapshotsUnchanged(before, after);
    }
  })();
}

async function createHistoricalSnapshotsAsync(
  files: readonly string[],
  read: (file: string) => Uint8Array | string | Promise<Uint8Array | string>,
): Promise<Map<string, string>> {
  const snapshots = new Map<string, string>();
  for (const file of files) {
    const value = await read(file);
    const bytes = typeof value === 'string' ? Buffer.from(value) : value;
    snapshots.set(file, createHash('sha256').update(bytes).digest('hex'));
  }
  return snapshots;
}

function redacted(value: string): string {
  try {
    const url = new URL(value);
    url.username = '<redacted>';
    url.password = '<redacted>';
    return url.toString();
  } catch {
    return '<redacted>';
  }
}

async function main(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const invocation = arguments_[0] === '--' ? arguments_.slice(1) : arguments_;
  const confirmFresh = invocation.length === 1 && invocation[0] === '--confirm-fresh';
  const databaseUrl = process.env.DATABASE_URL ?? '';
  try {
    validateBootstrapRequest({ confirmFresh, databaseUrl, postgresMajor: 16, manifestVersion: 1 });
    const packageRoot = resolve(__dirname, '..');
    const parsedDatabaseUrl = new URL(databaseUrl);
    const postgresEnvironment = {
      PGHOST: parsedDatabaseUrl.hostname,
      PGPORT: parsedDatabaseUrl.port || '5432',
      PGUSER: decodeURIComponent(parsedDatabaseUrl.username),
      PGPASSWORD: decodeURIComponent(parsedDatabaseUrl.password),
      PGDATABASE: parsedDatabaseUrl.pathname.slice(1),
    };
    const manifest = JSON.parse(await readFile(join(packageRoot, 'bootstrap/v1/manifest.json'), 'utf8')) as BootstrapManifest;
    const readAsset = async (path: string): Promise<Uint8Array> => {
      const absolute = resolve(packageRoot, path);
      if (relative(packageRoot, absolute).startsWith('..')) fail('asset path escaped package root');
      return readFile(absolute);
    };
    const run = (command: string, args: readonly string[], input?: string): Promise<string> => new Promise((resolveRun, reject) => {
      const child = spawn(command, [...args], { cwd: packageRoot, env: { ...process.env, DATABASE_URL: databaseUrl, ...postgresEnvironment }, stdio: ['pipe', 'pipe', 'pipe'] });
      let stderr = '';
      let stdout = '';
      child.stdout.on('data', chunk => { stdout += String(chunk); });
      child.stderr.on('data', chunk => { stderr += String(chunk); });
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolveRun(stdout) : reject(new Error(stderr || `${command} failed`)));
      if (input) child.stdin.end(input); else child.stdin.end();
    });
    const queryTarget = async () => {
      const result = await runPsqlQuery(databaseUrl, packageRoot, run);
      return result;
    };
    await runFreshBootstrap({ confirmFresh, databaseUrl, postgresMajor: 16, manifestVersion: 1 }, manifest, {
      readFile: readAsset,
      queryTarget,
      executeSql: async (sql, transaction) => { await run('psql', buildPsqlArgs(transaction === 'required'), sql); },
      runCommand: run,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown bootstrap failure';
    process.stderr.write(`fresh bootstrap failed for ${redacted(databaseUrl)}: ${message}\n`);
    process.exitCode = 1;
  }
}

async function runPsqlQuery(
  _databaseUrl: string,
  packageRoot: string,
  run: (command: string, args: readonly string[], input?: string) => Promise<string>,
): Promise<BootstrapTarget & { postgresMajor: number; databaseName: string }> {
  const sql = `SELECT split_part(current_setting('server_version'), '.', 1) AS major,
current_database() AS database_name,
(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%') AS user_objects,
(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relname='_prisma_migrations') AS ledger;`;
  // The default runner intentionally does not expose stdout; this query is replaced by
  // the injected harness in tests. Keep the production boundary argument-safe.
  const output = await run('psql', [...buildPsqlArgs(false), '--tuples-only', '--no-align'], sql);
  const [major, databaseName, userObjectCount, ledgerCount] = output.trim().split('|');
  if (!major || !databaseName || !userObjectCount || !ledgerCount) fail('target probe returned invalid data');
  return { postgresMajor: Number(major), databaseName, userObjectCount: Number(userObjectCount), ledgerCount: Number(ledgerCount) };
}

if (require.main === module) void main();
