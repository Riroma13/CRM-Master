import assert from 'node:assert/strict';
import test from 'node:test';

async function validate(changedPaths, documents = []) {
  const { validateChangedPaths } = await import('../validate-changed-paths.mjs');
  return validateChangedPaths({ changedPaths, documents });
}

async function runDoorbell(changedPaths) {
  const { runDocumentationSafetyDoorbell } = await import('../validate-changed-paths.mjs');
  return runDocumentationSafetyDoorbell({ changedPaths });
}

test('accepts declared change-local readiness artifacts', async () => {
  assert.deepEqual(await validate([
    'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/evidence/readiness-report.md',
    'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/validation/validate-readiness.mjs',
  ]), []);
});

test('accepts every path in the reproducible SPEC-owned scope', async () => {
  const { loadOwnedPathScope } = await import('../validate-changed-paths.mjs');
  const scope = await loadOwnedPathScope();
  assert.deepEqual(await validate(scope.ownedPaths), []);
});

test('records unrelated recovery paths as exclusions instead of SPEC failures', async () => {
  const { inspectChangedPathScope, loadOwnedPathScope } = await import('../validate-changed-paths.mjs');
  const scope = await loadOwnedPathScope();
  const result = await inspectChangedPathScope({
    changedPaths: [
      ...scope.excludedPaths.map(({ path }) => path),
      'apps/api/src/app.module.ts',
      'packages/database/prisma/schema.prisma',
      'docs/architecture/platform-roadmap.md',
      'pnpm-lock.yaml',
    ],
  });

  assert.deepEqual(result.failures, []);
  assert.deepEqual(
    result.excludedPaths.slice(0, scope.excludedPaths.length).map(({ path }) => path),
    scope.excludedPaths.map(({ path }) => path),
  );
  assert.equal(result.excludedPaths.length, scope.excludedPaths.length + 4);
});

test('fails non-Working-Set paths', async () => {
  assert.match(
    (await validate(['apps/api/src/app.module.ts'])).join('\n'),
    /non-Working-Set path: apps\/api\/src\/app.module\.ts/,
  );
});

test('fails SPEC-SDD-0002 Stable, release, freeze-restoration, and tag actions', async () => {
  const actions = [
    'SPEC-SDD-0002 action: declare Stable',
    'SPEC-SDD-0002 action: release',
    'SPEC-SDD-0002 action: restore the freeze',
    'SPEC-SDD-0002 action: create tag',
  ];

  for (const action of actions) {
    assert.match((await validate([], [action])).join('\n'), /SPEC-SDD-0002 scope violation/);
  }
});

test('runs the documentation safety doorbell before accepting declared paths', async () => {
  assert.deepEqual(await runDoorbell([
    'openspec/changes/SPEC-SDD-0001-sdd-v3-stabilization/evidence/readiness-report.md',
  ]), []);
});
