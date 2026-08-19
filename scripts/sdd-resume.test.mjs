import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { after, describe, test } from 'node:test';

import {
  branchChangeName,
  discoverActiveChanges,
  formatResumeResult,
  resolveResume,
} from './sdd-resume.mjs';

const temporaryDirectories = [];

after(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('/sdd-resume resolution', () => {
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
    assert.equal(branchChangeName('sec/example-change'), 'example-change');
    assert.equal(branchChangeName('chore/example-change'), 'example-change');

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
    assert.match(resume, /sdd-runtime|runtime state/i);
    assert.match(resume, /STOP/i);
  });
});
