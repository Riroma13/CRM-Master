import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import test from 'node:test';

const changeRoot = new URL('../..', import.meta.url);
const repositoryRoot = new URL('../../../', changeRoot);
const sources = {
  design: new URL('design.md', changeRoot),
  guard: new URL('docs/sdd-workflow-guard.md', repositoryRoot),
  template: new URL('docs/templates/design-enterprise-template.md', repositoryRoot),
};

async function createFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'sdd-structure-'));
  const fixture = {};

  for (const [name, source] of Object.entries(sources)) {
    const destination = join(directory, basename(source.pathname));
    await cp(source, destination);
    fixture[name] = destination;
  }

  return { directory, fixture };
}

async function validate(fixture) {
  const { validateStructure } = await import('../validate-structure.mjs');
  return validateStructure(fixture);
}

test('accepts the approved governance documents', async (t) => {
  const { directory, fixture } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  assert.deepEqual(await validate(fixture), []);
});

test('fails when a required Architecture Review topic is missing', async (t) => {
  const { directory, fixture } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const design = await readFile(fixture.design, 'utf8');
  await writeFile(
    fixture.design,
    design.replace('### G. Partitioning Strategy', '### Missing topic'),
  );

  assert.match((await validate(fixture)).join('\n'), /missing Architecture Review topic: G/);
});

test('fails when an Architecture Review topic omits its Alternative', async (t) => {
  const { directory, fixture } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const design = await readFile(fixture.design, 'utf8');
  await writeFile(
    fixture.design,
    design.replace(
      '**Alternative:** add a database/queue now; rejected as runtime infrastructure without recurrence evidence.',
      '',
    ),
  );

  assert.match(
    (await validate(fixture)).join('\n'),
    /Architecture Review topic A missing contract field: Alternative/,
  );
});

test('fails when authority boundaries conflict', async (t) => {
  const { directory, fixture } = await createFixture();
  t.after(() => rm(directory, { recursive: true, force: true }));

  const template = await readFile(fixture.template, 'utf8');
  await writeFile(
    fixture.template,
    `${template}\nWorkflow transition authority: Design template\n`,
  );

  assert.match(
    (await validate(fixture)).join('\n'),
    /authority conflict: template cannot own workflow transitions/,
  );
});

test('fails when SPEC-SDD-0001 is assigned Stable, release, freeze restoration, or tag actions', async (t) => {
  const scenarios = [
    ['declare Stable', 'declare Stable'],
    ['restore the freeze', 'restore the freeze'],
    ['release', 'release'],
    ['create tags', 'create tags'],
  ];

  for (const [action, expectedError] of scenarios) {
    await t.test(action, async (t) => {
      const { directory, fixture } = await createFixture();
      t.after(() => rm(directory, { recursive: true, force: true }));

      const design = await readFile(fixture.design, 'utf8');
      await writeFile(fixture.design, `${design}\nSPEC-SDD-0001 action: ${action}\n`);

      assert.match(
        (await validate(fixture)).join('\n'),
        new RegExp(`release scope violation: SPEC-SDD-0001 cannot ${expectedError}`),
      );
    });
  }
});
