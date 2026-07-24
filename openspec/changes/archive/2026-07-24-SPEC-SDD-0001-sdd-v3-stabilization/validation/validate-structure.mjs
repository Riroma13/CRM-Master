import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const changeRoot = new URL('..', import.meta.url);
const repositoryRoot = new URL('../../../', changeRoot);

const topics = [
  ['A', 'Scalability'],
  ['B', 'Open/Closed Principle (OCP)'],
  ['C', 'Ownership'],
  ['D', 'Data Retention'],
  ['E', 'Idempotency'],
  ['F', 'Shared Contracts'],
  ['G', 'Partitioning Strategy'],
];

const defaults = {
  design: fileURLToPath(new URL('design.md', changeRoot)),
  guard: fileURLToPath(new URL('docs/sdd-workflow-guard.md', repositoryRoot)),
  template: fileURLToPath(new URL('docs/templates/design-enterprise-template.md', repositoryRoot)),
};

function topicSection(document, letter, title) {
  const heading = `### ${letter}. ${title}`;
  const start = document.indexOf(heading);
  if (start === -1) {
    return null;
  }

  const nextTopic = document.indexOf('\n### ', start + heading.length);
  return document.slice(start, nextTopic === -1 ? document.length : nextTopic);
}

export async function validateStructure(paths = defaults) {
  const [design, guard, template] = await Promise.all([
    readFile(paths.design, 'utf8'),
    readFile(paths.guard, 'utf8'),
    readFile(paths.template, 'utf8'),
  ]);
  const failures = [];

  for (const [letter, title] of topics) {
    const designTopic = topicSection(design, letter, title);
    const templateTopic = topicSection(template, letter, title);

    if (!designTopic) {
      failures.push(`missing Architecture Review topic: ${letter}`);
    }
    if (!templateTopic) {
      failures.push(`template missing Architecture Review topic: ${letter}`);
    }

    for (const field of ['Decision', 'Rationale', 'Alternative', 'Future impact']) {
      if (designTopic && !designTopic.includes(`**${field}:**`)) {
        failures.push(`Architecture Review topic ${letter} missing contract field: ${field}`);
      }
      if (templateTopic && !templateTopic.includes(`**${field}:**`)) {
        failures.push(
          `template Architecture Review topic ${letter} missing contract field: ${field}`,
        );
      }
    }
  }

  if (!guard.includes('The Workflow Guard is the sole workflow transition authority.')) {
    failures.push(
      'authority conflict: Workflow Guard must be the sole workflow transition authority',
    );
  }
  if (template.includes('Workflow transition authority:')) {
    failures.push('authority conflict: template cannot own workflow transitions');
  }
  if (!template.includes('Template authority is limited to artifact shape.')) {
    failures.push('authority conflict: template authority boundary is missing');
  }

  const prohibitedActions = [
    ['declare Stable', /SPEC-SDD-0001 action:\s*declare Stable/i],
    ['restore the freeze', /SPEC-SDD-0001 action:\s*restore (?:the )?freeze/i],
    ['release', /SPEC-SDD-0001 action:\s*release/i],
    ['create tags', /SPEC-SDD-0001 action:\s*(?:create )?tags?/i],
  ];

  for (const [action, expression] of prohibitedActions) {
    if (expression.test(design)) {
      failures.push(`release scope violation: SPEC-SDD-0001 cannot ${action}`);
    }
  }

  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = await validateStructure();
  if (failures.length > 0) {
    console.error(`FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('PASS: governance structure is valid');
  }
}
