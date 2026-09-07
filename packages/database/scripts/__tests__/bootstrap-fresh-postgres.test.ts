import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertHistoricalSnapshotsUnchanged,
  createHistoricalSnapshots,
  executeBootstrap,
  validateBootstrapRequest,
  validateManifest,
  verifyManifestAssets,
  buildPrismaCommand,
  buildPsqlArgs,
  runFreshBootstrap,
} from '../bootstrap-fresh-postgres';

const migrationFiles = [
  'prisma/migrations/20260714222500_add_client_users/migration.sql',
  'prisma/migrations/20260714222500_add_client_users/migration_lock.toml',
  'prisma/migrations/20260903120000_add_cliente_contact_fields/migration.sql',
];

const validRequest = {
  confirmFresh: true,
  databaseUrl: 'postgresql://bootstrap-user:secret@localhost:5432/fresh_db',
  postgresMajor: 16,
  manifestVersion: 1,
};

const databaseUrl = process.env.DATABASE_URL;

function runPostgres(sql: string): string {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the PostgreSQL cutoff proof');
  return execFileSync('psql', [
    '--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align',
    '--dbname', databaseUrl,
  ], { input: sql, encoding: 'utf8' }).trim();
}

describe('fresh PostgreSQL bootstrap foundation contract', () => {
  const packageRoot = resolve(__dirname, '../..');
  const bootstrapRoot = resolve(packageRoot, 'bootstrap/v1');
  const manifest = JSON.parse(readFileSync(resolve(bootstrapRoot, 'manifest.json'), 'utf8'));

  it('matches every checked-in component and migration digest in lexical order', () => {
    expect(manifest.components.map((component: { path: string }) => component.path)).toEqual([
      'bootstrap/v1/components/01-pgvector.sql',
      'bootstrap/v1/schema.sql',
      'bootstrap/v1/reporting.sql',
      'bootstrap/v1/components/04-activity-timeline-trigger.sql',
      'bootstrap/v1/components/05-audit-append-only-trigger.sql',
    ]);
    expect(manifest.components.map((component: { transaction: string }) => component.transaction)).toEqual([
      'required', 'required', 'required', 'required', 'forbidden',
    ]);

    const migrationNames = manifest.migrations.map((migration: { name: string }) => migration.name);
    expect(migrationNames).toEqual([...migrationNames].sort());
    for (const component of manifest.components) {
      const bytes = readFileSync(resolve(packageRoot, component.path));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(component.sha256);
    }
    for (const migration of manifest.migrations) {
      const bytes = readFileSync(resolve(packageRoot, `prisma/migrations/${migration.name}/migration.sql`));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(migration.sha256);
    }
    expect(manifest.schemaSha256).toBe(manifest.components[1].sha256);
    expect(manifest.reportingSha256).toBe(manifest.components[2].sha256);
  });

  it('contains exactly the fixed reporting children and required catalog names', () => {
    const reporting = readFileSync(resolve(bootstrapRoot, 'reporting.sql'), 'utf8');
    const datasetChildren = [...reporting.matchAll(/CREATE TABLE (analytics_datasets_(?:\d{4}_\d{2}|default))/g)].map(match => match[1]);
    const snapshotChildren = [...reporting.matchAll(/CREATE TABLE (analytics_snapshots_(?:\d{4}_\d{2}|default))/g)].map(match => match[1]);
    expect(datasetChildren).toHaveLength(121);
    expect(snapshotChildren).toHaveLength(121);
    expect(new Set(datasetChildren).size).toBe(121);
    expect(new Set(snapshotChildren).size).toBe(121);
    expect(datasetChildren.filter(name => name.endsWith('_default'))).toEqual(['analytics_datasets_default']);
    expect(snapshotChildren.filter(name => name.endsWith('_default'))).toEqual(['analytics_snapshots_default']);
    for (const name of [
      'analytics_datasets_tenant_id_dataset_name_metric_name_granul_key',
      'analytics_datasets_tenant_id_dataset_name_granularity_window_idx',
      'analytics_datasets_tenant_id_metric_name_window_start_idx',
      'analytics_datasets_tenant_id_idx',
      'analytics_snapshots_tenant_id_name_expires_at_idx',
      'analytics_snapshots_tenant_id_idx',
      'create_monthly_partition',
      'drop_old_partitions',
    ]) expect(reporting).toContain(name);
    expect(reporting).toContain('PRIMARY KEY (id, window_start)');
    expect(reporting).toContain('PARTITION BY RANGE (window_start)');
  });

  it.skipIf(!databaseUrl)('proves strict cutoff retention against a disposable PostgreSQL catalog', () => {
    const schema = `reporting_cutoff_${process.pid}`;
    const reporting = readFileSync(resolve(bootstrapRoot, 'reporting.sql'), 'utf8');
    const functionSql = reporting.match(/CREATE OR REPLACE FUNCTION drop_old_partitions[\s\S]*?\$\$ LANGUAGE plpgsql;/)?.[0];
    expect(functionSql).toBeDefined();

    try {
      const result = runPostgres(`
        CREATE SCHEMA ${schema};
        SET search_path TO ${schema};
        CREATE TABLE analytics_datasets (
          id TEXT NOT NULL,
          tenant_id TEXT NOT NULL,
          window_start DATE NOT NULL
        ) PARTITION BY RANGE (window_start);
        CREATE TABLE analytics_datasets_2024_01 PARTITION OF analytics_datasets
          FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
        CREATE TABLE analytics_datasets_2024_02 PARTITION OF analytics_datasets
          FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
        CREATE TABLE analytics_datasets_2024_03 PARTITION OF analytics_datasets
          FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
        CREATE TABLE analytics_datasets_default PARTITION OF analytics_datasets DEFAULT;
        ${functionSql}
        SELECT drop_old_partitions(DATE '2024-02-15', 'analytics_datasets');
        SELECT string_agg(c.relname, ',' ORDER BY c.relname)
         FROM pg_inherits i
          JOIN pg_class c ON c.oid = i.inhrelid
         WHERE i.inhparent = '${schema}.analytics_datasets'::regclass;
        SELECT count(*)
         FROM pg_inherits i
          JOIN pg_class c ON c.oid = i.inhrelid
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND NOT a.attisdropped
         WHERE i.inhparent = '${schema}.analytics_datasets'::regclass;
        SELECT drop_old_partitions(DATE '2024-02-15', 'analytics_datasets');
      `);

      expect(result.split('\n')).toEqual(['1', 'analytics_datasets_2024_02,analytics_datasets_2024_03,analytics_datasets_default', '3', '0']);
    } finally {
      runPostgres(`DROP SCHEMA IF EXISTS ${schema} CASCADE;`);
    }
  });

  it('applies manifest transaction modes and resolves every migration before status/deploy', async () => {
    const sqlStages: string[] = [];
    const transactions: string[] = [];
    const commands: string[][] = [];
    const reads = async (path: string) => readFileSync(resolve(packageRoot, path));
    await runFreshBootstrap({
      confirmFresh: true,
      databaseUrl: validRequest.databaseUrl,
      postgresMajor: 16,
      manifestVersion: 1,
    }, manifest, {
      readFile: reads,
      queryTarget: async () => ({ postgresMajor: 16, databaseName: 'fresh_db', userObjectCount: 0, ledgerCount: 0 }),
      executeSql: async (sql, transaction) => { sqlStages.push(sql.slice(0, 20)); transactions.push(transaction); },
      runCommand: async (_command, args) => { commands.push([...args]); return ''; },
    });
    expect(sqlStages).toHaveLength(5);
    expect(transactions).toEqual(['required', 'required', 'required', 'required', 'forbidden']);
    expect(commands.slice(0, -2).map(args => args[3])).toEqual(manifest.migrations.map((migration: { name: string }) => migration.name));
    expect(commands.at(-2)?.[1]).toBe('status');
    expect(commands.at(-1)?.[1]).toBe('deploy');
  });

  describe('request and manifest preflight', () => {
    it.each([
      [{ ...validRequest, confirmFresh: false }, 'explicit confirmation'],
      [{ ...validRequest, databaseUrl: '' }, 'DATABASE_URL'],
      [{ ...validRequest, databaseUrl: 'mysql://localhost/fresh_db' }, 'PostgreSQL URL'],
      [{ ...validRequest, postgresMajor: 15 }, 'PostgreSQL 16'],
      [{ ...validRequest, manifestVersion: 2 }, 'manifest version'],
    ])('rejects %s', (request, reason) => {
      expect(() => validateBootstrapRequest(request)).toThrow(reason);
    });

    it('accepts only the explicit fresh invocation contract', () => {
      expect(validateBootstrapRequest(validRequest)).toEqual({
        confirmFresh: true,
        databaseUrl: validRequest.databaseUrl,
        postgresMajor: 16,
        manifestVersion: 1,
      });
    });

    it.each([
      [{ path: '../outside.sql', sha256: 'a'.repeat(64), transaction: 'required' }, 'fixed path'],
      [{ path: 'bootstrap/v1/schema.sql', sha256: 'not-a-digest', transaction: 'required' }, 'SHA-256'],
      [{ path: 'bootstrap/v1/schema.sql', sha256: 'a'.repeat(64), transaction: 'optional' }, 'transaction'],
    ] as const)('rejects an invalid manifest component (%s)', (component, reason) => {
      expect(() => validateManifest({ version: 1, postgresMajor: 16, components: [component as never] })).toThrow(
        reason,
      );
    });
  });

  describe('target safety and diagnostics', () => {
    it.each([
      ['maintenance database', { isMaintenanceDatabase: true, userObjectCount: 0, ledgerCount: 0 }],
      ['non-empty database', { userObjectCount: 1, ledgerCount: 0 }],
      ['user objects', { userObjectCount: 2, ledgerCount: 0 }],
      ['ledgered database', { userObjectCount: 0, ledgerCount: 1 }],
    ] as const)('rejects a %s target before execution', (reason, target) => {
      expect(() => executeBootstrap({ request: validRequest, target })).toThrow(reason);
    });

    it('never includes credentials in failure diagnostics', () => {
      try {
        executeBootstrap({
          request: validRequest,
          target: { userObjectCount: 1, ledgerCount: 0 },
        });
      } catch (error) {
        expect(String(error)).not.toContain('secret');
        expect(String(error)).not.toContain(validRequest.databaseUrl);
      }
    });

    it('rejects a rerun after a failed stage altered the target', () => {
      expect(() => executeBootstrap({
        request: validRequest,
        target: { userObjectCount: 0, ledgerCount: 0, alteredByPreviousAttempt: true },
      })).toThrow('altered target');
    });
  });

  describe('ordered execution and immutable history', () => {
    it('executes the exact fresh-only stage order and resolves lexical migrations once', async () => {
      const events: string[] = [];
      await executeBootstrap({
        request: validRequest,
        target: { userObjectCount: 0, ledgerCount: 0 },
        runStage: async stage => { events.push(stage); },
        migrationDirectories: [
          '20260903120000_add_cliente_contact_fields',
          '20260714222500_add_client_users',
        ],
      });

      expect(events).toEqual([
        'pgvector',
        'schema.sql',
        'reporting.sql',
        'triggers/functions',
        'resolve:20260714222500_add_client_users',
        'resolve:20260903120000_add_cliente_contact_fields',
        'status',
        'deploy',
      ]);
    });

    it('stops at the first failed stage and never resolves or deploys afterward', async () => {
      const events: string[] = [];
      await expect(executeBootstrap({
        request: validRequest,
        target: { userObjectCount: 0, ledgerCount: 0 },
        runStage: async stage => {
          events.push(stage);
          if (stage === 'reporting.sql') throw new Error('reporting failed');
        },
        migrationDirectories: ['20260714222500_add_client_users'],
      })).rejects.toThrow('reporting failed');

      expect(events).toEqual(['pgvector', 'schema.sql', 'reporting.sql']);
    });

    it('does not expose resolve or cutover for an existing target', async () => {
      await expect(executeBootstrap({
        request: validRequest,
        target: { userObjectCount: 1, ledgerCount: 0 },
        migrationDirectories: ['20260714222500_add_client_users'],
      })).rejects.toThrow('non-empty database');
    });

    it('snapshots every historical migration and lock byte and rejects any mismatch', () => {
      const before = createHistoricalSnapshots(migrationFiles, file => Buffer.from(file));
      const after = createHistoricalSnapshots(migrationFiles, file => Buffer.from(file));
      expect(assertHistoricalSnapshotsUnchanged(before, after)).toBe(true);

      const altered = new Map(after);
      altered.set(migrationFiles[1], 'changed');
      expect(() => assertHistoricalSnapshotsUnchanged(before, altered)).toThrow('byte mismatch');
    });
  });

  describe('production wiring contracts', () => {
    it('verifies all fixed manifest assets and historical migration bytes', async () => {
      const manifest = {
        version: 1 as const,
        postgresMajor: 16 as const,
        components: [
          ['bootstrap/v1/components/01-pgvector.sql', 'pgvector'],
          ['bootstrap/v1/schema.sql', 'schema'],
          ['bootstrap/v1/reporting.sql', 'reporting'],
          ['bootstrap/v1/components/04-activity-timeline-trigger.sql', 'timeline'],
          ['bootstrap/v1/components/05-audit-append-only-trigger.sql', 'audit'],
        ].map(([path, value]) => ({ path, sha256: createHash('sha256').update(value).digest('hex'), transaction: 'required' as const })),
        migrations: [{ name: '20260714222500_add_client_users', sha256: createHash('sha256').update('migration').digest('hex') }],
      };
      const reads: string[] = [];
      const values: Record<string, string> = {
        'bootstrap/v1/components/01-pgvector.sql': 'pgvector', 'bootstrap/v1/schema.sql': 'schema',
        'bootstrap/v1/reporting.sql': 'reporting', 'bootstrap/v1/components/04-activity-timeline-trigger.sql': 'timeline',
        'bootstrap/v1/components/05-audit-append-only-trigger.sql': 'audit',
      };
      await expect(verifyManifestAssets(manifest, async path => {
        reads.push(path);
        return values[path] ?? 'migration';
      }, { ...values, 'prisma/migrations/20260714222500_add_client_users/migration.sql': 'migration' })).resolves.toBe(true);
      expect(reads).toHaveLength(0);
    });

    it('builds fixed argument arrays without embedding the database URL', () => {
      expect(buildPsqlArgs(true)).toEqual(['--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1', '--single-transaction']);
      expect(buildPsqlArgs(false)).toEqual(['--no-psqlrc', '--quiet', '--set', 'ON_ERROR_STOP=1']);
      expect(buildPrismaCommand('resolve', '20260714222500_add_client_users')).toEqual([
        'migrate', 'resolve', '--applied', '20260714222500_add_client_users', '--schema', 'prisma/schema.prisma',
      ]);
    });
  });
});
