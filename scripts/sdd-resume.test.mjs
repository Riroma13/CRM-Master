import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { after, describe, test } from 'node:test';

import {
  branchChangeName,
  canonicalBranchChangeName,
  discoverActiveChanges,
  discoverExistingChangeNames,
  formatResumeResult,
  resolveChangeName,
  resolveRepositoryChangeName,
  resolveResume,
} from './sdd-resume.mjs';
import { buildInitialState } from './sdd-runtime.mjs';

const temporaryDirectories = [];

after(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('/sdd-resume resolution', () => {
  test('canonicalizes the full feature branch instead of using only its suffix', () => {
    assert.equal(canonicalBranchChangeName('fix/sdd-export-hardening'), 'fix-sdd-export-hardening');
    assert.equal(canonicalBranchChangeName('feat/client-import'), 'feat-client-import');
    assert.equal(branchChangeName('fix/sdd-export-hardening'), 'fix-sdd-export-hardening');
    assert.equal(canonicalBranchChangeName('main'), null);
    assert.equal(canonicalBranchChangeName('master'), null);
  });

  test('direct resolution precedence is explicit, active, then branch-derived', () => {
    const explicit = resolveChangeName({
      explicitChange: 'my-change',
      branch: 'main',
      activeChanges: [{ name: 'first-change' }, { name: 'second-change' }],
    });
    assert.equal(explicit.status, 'READY');
    assert.equal(explicit.change, 'my-change');
    assert.equal(explicit.source, 'explicit');
    assert.equal(explicit.human_required, false);

    const active = resolveChangeName({
      branch: 'feat/client-import',
      activeChanges: [{ name: 'existing-change' }],
    });
    assert.equal(active.status, 'READY');
    assert.equal(active.change, 'existing-change');
    assert.equal(active.source, 'active');
    assert.equal(active.human_required, false);

    const branch = resolveChangeName({ branch: 'feat/client-import' });
    assert.equal(branch.status, 'READY');
    assert.equal(branch.change, 'feat-client-import');
    assert.equal(branch.source, 'branch');
    assert.equal(branch.human_required, false);
  });

  test('direct resolution fails closed for ambiguity, protected branches, and incompatible paths', () => {
    const multiple = resolveChangeName({
      branch: 'feat/client-import',
      activeChanges: [{ name: 'first-change' }, { name: 'second-change' }],
    });
    assert.equal(multiple.status, 'STOP');
    assert.equal(multiple.human_required, true);
    assert.equal(multiple.reason, 'multiple-active-changes');

    const protectedBranch = resolveChangeName({ branch: 'main' });
    assert.equal(protectedBranch.status, 'STOP');
    assert.equal(protectedBranch.human_required, true);

    const conflict = resolveChangeName({
      branch: 'fix/sdd-export-hardening',
      existingChanges: ['fix-sdd-export-hardening'],
    });
    assert.equal(conflict.status, 'STOP');
    assert.equal(conflict.human_required, true);
    assert.equal(conflict.reason, 'branch-derived-name-conflict');
  });

  test('repository resolution derives the current branch without creating duplicate directories', async () => {
    const changesRoot = await mkdtemp(join(tmpdir(), 'crm-sdd-direct-resolution-'));
    temporaryDirectories.push(changesRoot);
    const before = await import('node:fs/promises').then(({ readdir }) => readdir(changesRoot));

    const first = resolveRepositoryChangeName({
      branch: 'fix/sdd-export-hardening',
      changesRoot,
      cwd: changesRoot,
    });
    const second = resolveRepositoryChangeName({
      branch: 'fix/sdd-export-hardening',
      changesRoot,
      cwd: changesRoot,
    });

    assert.equal(first.status, 'READY');
    assert.equal(first.change, 'fix-sdd-export-hardening');
    assert.deepEqual(second, first);
    assert.deepEqual(await import('node:fs/promises').then(({ readdir }) => readdir(changesRoot)), before);
    assert.deepEqual(discoverExistingChangeNames(changesRoot), []);
  });

  test('repository resolution stops when multiple active paths are associated with one branch', async () => {
    const changesRoot = await mkdtemp(join(tmpdir(), 'crm-sdd-direct-ambiguous-'));
    temporaryDirectories.push(changesRoot);
    await Promise.all(
      ['feat-client-import', 'client-import'].map(async (name) => {
        await mkdir(join(changesRoot, name), { recursive: true });
        await writeFile(join(changesRoot, name, 'design.md'), '# Design\n');
      }),
    );

    const result = resolveRepositoryChangeName({
      branch: 'feat/client-import',
      changesRoot,
      cwd: changesRoot,
    });

    assert.equal(result.status, 'STOP');
    assert.equal(result.human_required, true);
    assert.equal(result.reason, 'multiple-active-changes');
    assert.deepEqual(result.candidates, ['client-import', 'feat-client-import']);
  });

  test('repository resolution reuses a freshly bootstrapped runtime-only active change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'crm-sdd-direct-runtime-only-'));
    temporaryDirectories.push(root);
    const changesRoot = join(root, 'openspec', 'changes');
    const change = 'fix-sdd-export-hardening';
    const changePath = join(changesRoot, change);
    const fingerprints = { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64) };
    await mkdir(join(changePath, '.sdd-runtime'), { recursive: true });
    await writeFile(
      join(changePath, '.sdd-runtime', 'state.json'),
      JSON.stringify(buildInitialState({ root, change, fingerprints })),
    );

    const result = resolveRepositoryChangeName({
      branch: 'fix/sdd-export-hardening',
      cwd: root,
      changesRoot,
    });

    assert.equal(result.status, 'READY');
    assert.equal(result.change, change);
    assert.equal(result.source, 'runtime-state');
    assert.equal(result.next, 'Design');
  });

  test('direct resolution has no HUMAN prompt for explicit, active, or branch-derived identities', () => {
    for (const result of [
      resolveChangeName({ explicitChange: 'my-change', branch: 'main' }),
      resolveChangeName({ activeChanges: [{ name: 'active-change' }], branch: 'main' }),
      resolveChangeName({ branch: 'fix/sdd-export-hardening' }),
    ]) {
      assert.equal(result.status, 'READY');
      assert.equal(result.human_required, false);
      assert.equal(Object.hasOwn(result, 'prompt'), false);
    }
  });

  test('resolves an exact branch-to-change match', () => {
    const result = resolveResume({
      branch: 'example-change',
      activeChanges: [{ name: 'example-change' }, { name: 'other-change' }],
    });

    assert.equal(result.status, 'READY');
    assert.equal(result.change, 'example-change');
    assert.equal(result.source, 'branch');
  });

  test('resolves a prefixed branch by its change-name suffix', () => {
    assert.equal(branchChangeName('sec/example-change'), 'sec-example-change');
    assert.equal(branchChangeName('chore/example-change'), 'chore-example-change');

    const result = resolveResume({
      branch: 'chore/example-change',
      activeChanges: [{ name: 'example-change' }, { name: 'other-change' }],
    });

    assert.equal(result.status, 'READY');
    assert.equal(result.change, 'example-change');
  });

  test('falls back to one active change when the branch has no match', () => {
    const result = resolveResume({
      branch: 'main',
      activeChanges: [{ name: 'only-change', checkpoint: { phase: 'Tasks' } }],
    });

    assert.equal(result.status, 'READY');
    assert.equal(result.change, 'only-change');
    assert.equal(result.source, 'single-active');
  });

  test('stops and lists only candidate names when multiple changes are active', () => {
    const result = resolveResume({
      branch: 'main',
      activeChanges: [{ name: 'z-change' }, { name: 'a-change' }],
    });

    assert.equal(result.status, 'STOP');
    assert.deepEqual(result.candidates, ['a-change', 'z-change']);
    assert.equal(formatResumeResult(result), 'STOP\na-change\nz-change');
  });

  test('stops with an actionable message when no active change exists', () => {
    const result = resolveResume({ branch: 'main', activeChanges: [] });

    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'no-active-change');
    assert.match(formatResumeResult(result), /\/sdd-direct <change-name>/);
  });

  test('ignores archived and explicitly completed changes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'crm-sdd-resume-'));
    temporaryDirectories.push(directory);
    await mkdir(join(directory, 'archive', '2026-08-01-archived-change'), { recursive: true });
    await mkdir(join(directory, 'archived-change'));
    await mkdir(join(directory, 'completed-change'));
    await mkdir(join(directory, 'active-change'));
    await writeFile(join(directory, 'archived-change', 'design.md'), '# Archived Design\n');
    await writeFile(join(directory, 'completed-change', 'state.md'), 'status: ARCHIVED\n');
    await writeFile(join(directory, 'active-change', 'design.md'), '# Design\n');

    const changes = discoverActiveChanges(directory);

    assert.deepEqual(
      changes.map((change) => change.name),
      ['active-change'],
    );
  });

  test('delegates a resolved change to the canonical direct entry point', () => {
    const result = resolveResume({
      branch: 'chore/example-change',
      activeChanges: [{ name: 'example-change' }],
    });
    const command = readFileSync(
      new URL('../.opencode/commands/sdd-resume.md', import.meta.url),
      'utf8',
    );

    assert.equal(result.delegation, '/sdd-direct example-change');
    assert.match(formatResumeResult(result), /delegation: \/sdd-direct example-change/);
    assert.match(command, /agent: sdd-direct-orchestrator/);
    assert.match(command, /canonical\s+equivalent of `\/sdd-direct <resolved-change>`/);
  });

  test('preserves the existing lifecycle checkpoint', () => {
    const checkpoint = {
      artifact: 'tasks-review.md',
      phase: 'Tasks Review',
      status: 'BLOCKED',
      next: 'Tasks Refinement',
    };
    const result = resolveResume({
      branch: 'main',
      activeChanges: [{ name: 'checkpointed-change', checkpoint }],
    });

    assert.deepEqual(result.checkpoint, checkpoint);
    assert.equal(result.next, 'Tasks Refinement');
    assert.match(
      formatResumeResult(result),
      /recovered lifecycle checkpoint: Tasks Review \/ tasks-review\.md \/ BLOCKED/,
    );
  });

  test('uses one explicit persisted state record only as the final fallback', () => {
    const result = resolveResume({
      branch: 'main',
      activeChanges: [],
      persistedState: {
        current: {
          change: 'persisted-change',
          active: true,
          checkpoint: { phase: 'Verify', next: 'Archive' },
        },
      },
    });

    assert.equal(result.status, 'READY');
    assert.equal(result.change, 'persisted-change');
    assert.equal(result.source, 'persisted-state');
    assert.equal(result.next, 'Archive');
  });

  test('prefers a validated change-local runtime checkpoint', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'crm-sdd-runtime-state-'));
    temporaryDirectories.push(directory);
    const changePath = join(directory, 'runtime-change');
    await mkdir(join(changePath, '.sdd-runtime'), { recursive: true });
    await writeFile(join(changePath, 'design.md'), '# Design\n');
    await writeFile(join(changePath, '.sdd-runtime', 'state.json'), JSON.stringify({
      schemaVersion: 2, change: 'runtime-change', canonicalPath: changePath, status: 'READY', sequence: 2,
      checkpoint: { phase: 'Tasks Review', artifact: 'tasks-review.md', verdict: 'PASS', next: 'Workload Guard' },
      fingerprints: { workflow: 'a'.repeat(64), modelMap: 'b'.repeat(64), config: 'c'.repeat(64), artifacts: {} },
      attempts: {}, traceCursor: { sequence: 2, eventHash: 'd'.repeat(64), chainHash: 'e'.repeat(64) }, lastTransition: null,
    }));

    const [candidate] = discoverActiveChanges(directory);
    const result = resolveResume({ branch: 'main', activeChanges: [candidate] });

    assert.equal(result.status, 'READY');
    assert.equal(result.source, 'runtime-state');
    assert.equal(result.next, 'Workload Guard');
  });

  test('stops on corrupt change-local runtime state instead of falling back', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'crm-sdd-corrupt-state-'));
    temporaryDirectories.push(directory);
    const changePath = join(directory, 'corrupt-change');
    await mkdir(join(changePath, '.sdd-runtime'), { recursive: true });
    await writeFile(join(changePath, 'design.md'), '# Design\n');
    await writeFile(join(changePath, '.sdd-runtime', 'state.json'), '{not-json');

    const [candidate] = discoverActiveChanges(directory);
    const result = resolveResume({ branch: 'main', activeChanges: [candidate] });

    assert.equal(result.status, 'STOP');
    assert.equal(result.reason, 'corrupt-runtime-state');
  });

  test('Direct and Resume commands declare runtime bootstrap and autonomous dispatch boundaries', () => {
    const direct = readFileSync(new URL('../.opencode/commands/sdd-direct.md', import.meta.url), 'utf8');
    const resume = readFileSync(new URL('../.opencode/commands/sdd-resume.md', import.meta.url), 'utf8');
    assert.match(direct, /sdd-runtime|runtime bootstrap/i);
    assert.match(direct, /Repository Ready|autonomous dispatch/i);
    assert.match(direct, /scripts\/sdd-resume\.mjs\s+--resolve-direct/);
    assert.doesNotMatch(direct, /change\s+name\s+is\s+required/i);
    assert.match(resume, /sdd-runtime|runtime state/i);
    assert.match(resume, /STOP/i);
  });
});
