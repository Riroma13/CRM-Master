#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);
const pathOf = (...parts) => join(ROOT, ...parts);
const relativePath = (file) => relative(ROOT, file) || '.';
const read = (file) => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

function frontmatter(text) {
  if (!text || !text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) return null;
  const values = {};
  for (const line of text.slice(4, end).split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

function parseJson(file) {
  const text = read(file);
  if (text === null) {
    fail(`${relativePath(file)}: missing or unreadable`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${relativePath(file)}: invalid JSON (${error.message})`);
    return null;
  }
}

function requireFile(file) {
  if (!existsSync(file)) fail(`${relativePath(file)}: required file is missing`);
}

const files = {
  agents: pathOf('AGENTS.md'),
  project: pathOf('.ai', 'context', 'PROJECT.md'),
  session: pathOf('.ai', 'context', 'SESSION.md'),
  decisions: pathOf('.ai', 'context', 'DECISIONS.md'),
  issues: pathOf('.ai', 'context', 'KNOWN_ISSUES.md'),
  roadmap: pathOf('.ai', 'context', 'ROADMAP.md'),
  workflow: pathOf('docs', 'SDD-WORKFLOW.md'),
  guard: pathOf('docs', 'sdd-workflow-guard.md'),
  direct: pathOf('docs', 'architecture', 'sdd-direct.md'),
  infrastructure: pathOf('docs', 'architecture', 'sdd-infrastructure.md'),
  baseline: pathOf('docs', 'architecture', 'platform-baseline.md'),
  changelog: pathOf('docs', 'architecture', 'CHANGELOG.md'),
  template: pathOf('docs', 'templates', 'design-enterprise-template.md'),
  templateReadme: pathOf('docs', 'templates', 'README.md'),
  applyTemplate: pathOf('docs', 'templates', 'apply-summary-template.md'),
  terminalTemplate: pathOf('docs', 'templates', 'terminal-gates-template.md'),
  modelHistory: pathOf('docs', 'SDD-MODEL-ASSIGNMENTS.md'),
  config: pathOf('openspec', 'config.yaml'),
  package: pathOf('package.json'),
  projectConfig: pathOf('opencode.json'),
  modelMap: pathOf('.opencode', 'sdd-model-map.json'),
  command: pathOf('.opencode', 'commands', 'sdd-direct.md'),
  resumeCommand: pathOf('.opencode', 'commands', 'sdd-resume.md'),
  runtime: pathOf('scripts', 'sdd-runtime.mjs'),
};

const localAgentNames = [
  'sdd-direct-orchestrator',
  'sdd-direct-design',
  'sdd-direct-architecture-review',
  'sdd-direct-tasks',
  'sdd-direct-tasks-review',
  'sdd-direct-apply',
  'sdd-direct-verify',
  'sdd-direct-archive',
  'sdd-direct-health-report',
  'sdd-direct-repository-ready',
];
const localAgentFiles = Object.fromEntries(
  localAgentNames.map((name) => [name, pathOf('.opencode', 'agents', `${name}.md`)]),
);
const legacyCommandNames = [
  'sdd-archive',
  'sdd-onboard',
  'sdd-status',
  'sdd-ff',
  'sdd-apply',
  'sdd-new',
  'sdd-metrics',
  'sdd-init',
  'sdd-verify',
  'sdd-doctor',
  'sdd-explore',
  'sdd-continue',
];
const legacyCommandFiles = Object.fromEntries(
  legacyCommandNames.map((name) => [name, pathOf('.opencode', 'commands', `${name}.md`)]),
);

const requiredFiles = [
  ...Object.values(files),
  ...Object.values(localAgentFiles),
  ...Object.values(legacyCommandFiles),
  pathOf('scripts', 'validate-sdd-direct.mjs'),
  pathOf('scripts', 'validate-enterprise-design.mjs'),
];
requiredFiles.forEach(requireFile);

const texts = Object.fromEntries(
  Object.entries(files).map(([name, file]) => [name, read(file) || '']),
);
const localAgentTexts = Object.fromEntries(
  Object.entries(localAgentFiles).map(([name, file]) => [name, read(file) || '']),
);
const legacyCommandTexts = Object.fromEntries(
  Object.entries(legacyCommandFiles).map(([name, file]) => [name, read(file) || '']),
);
const projectConfig = parseJson(files.projectConfig);
const modelMap = parseJson(files.modelMap);
const packageJson = parseJson(files.package);

// The workflow is the only file allowed to declare semantic authority.
const authorityCandidates = [
  files.agents,
  files.project,
  files.session,
  files.decisions,
  files.issues,
  files.roadmap,
  files.workflow,
  files.guard,
  files.direct,
  files.infrastructure,
  files.baseline,
  files.changelog,
  files.template,
  files.templateReadme,
  files.applyTemplate,
  files.terminalTemplate,
  files.modelHistory,
  ...Object.values(localAgentFiles),
  files.command,
];
const semanticAuthorityFiles = authorityCandidates.filter((file) =>
  /semantic_authority:\s*true\b/.test(read(file) || ''),
);
if (semanticAuthorityFiles.length !== 1 || semanticAuthorityFiles[0] !== files.workflow) {
  fail(
    `exactly one workflow semantic authority required; found ${semanticAuthorityFiles
      .map(relativePath)
      .join(', ') || 'none'}`,
  );
}

const expectedClassifications = new Map([
  [files.agents, 'PRIMARY AUTHORITY'],
  [files.workflow, 'PRIMARY AUTHORITY'],
  [files.guard, 'COMPATIBILITY STUB'],
  [files.direct, 'EXECUTION ADAPTER'],
  [files.infrastructure, 'EXECUTION ADAPTER'],
  [files.baseline, 'PROJECT CONTEXT'],
  [files.changelog, 'HISTORICAL'],
  [files.template, 'TEMPLATE'],
  [files.templateReadme, 'TEMPLATE'],
  [files.applyTemplate, 'TEMPLATE'],
  [files.terminalTemplate, 'TEMPLATE'],
  [files.modelHistory, 'HISTORICAL'],
  [files.project, 'PROJECT CONTEXT'],
  [files.session, 'PROJECT CONTEXT'],
  [files.decisions, 'PROJECT CONTEXT'],
  [files.issues, 'PROJECT CONTEXT'],
  [files.roadmap, 'PROJECT CONTEXT'],
]);
for (const [file, expected] of expectedClassifications) {
  const marker = frontmatter(read(file) || '')?.classification;
  if (marker !== expected) fail(`${relativePath(file)}: classification must be ${expected}`);
}
for (const [name, text] of Object.entries(localAgentTexts)) {
  if (!/^Classification:\s+EXECUTION ADAPTER\./m.test(text)) {
    fail(`${name}: missing EXECUTION ADAPTER classification`);
  }
}
if (!/^Classification:\s+EXECUTION ADAPTER\./m.test(texts.command)) {
  fail(`${relativePath(files.command)}: missing EXECUTION ADAPTER classification`);
}

// Version and lifecycle structure.
const workflowMeta = frontmatter(texts.workflow);
if (workflowMeta?.sdd_version !== 'v3') fail('workflow: sdd_version must be v3');
if (workflowMeta?.status !== 'ACTIVE/STABLE') fail('workflow: status must be ACTIVE/STABLE');
if (!/sole semantic workflow authority/i.test(texts.workflow)) {
  fail('workflow: sole semantic workflow authority declaration is missing');
}

function markedBlock(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) return '';
  return text.slice(startIndex + start.length, endIndex);
}

const lifecycle = markedBlock(
  texts.workflow,
  '<!-- canonical-lifecycle:start -->',
  '<!-- canonical-lifecycle:end -->',
);
const expectedPhases = [
  'Design',
  'Architecture Review',
  'Design Refinement',
  'Tasks',
  'Tasks Review',
  'Tasks Refinement',
  'Apply',
  'Verify',
  'Archive',
  'Health Report',
  'Repository Ready',
  'Commit',
  'Push',
  'Merge',
];
const phaseRows = [...lifecycle.matchAll(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/gm)].map((match) => ({
  number: Number(match[1]),
  name: match[2].trim(),
}));
if (phaseRows.length !== expectedPhases.length) {
  fail(`canonical lifecycle must contain exactly 14 phases, found ${phaseRows.length}`);
} else {
  phaseRows.forEach((phase, index) => {
    if (phase.number !== index + 1 || phase.name !== expectedPhases[index]) {
      fail(`canonical lifecycle phase ${index + 1} must be ${expectedPhases[index]}`);
    }
  });
}

const applyBlock = markedBlock(
  texts.workflow,
  '<!-- apply-substeps:start -->',
  '<!-- apply-substeps:end -->',
);
const expectedApply = [
  ['7.1', 'Foundation'],
  ['7.2', 'Core Engine'],
  ['7.3', 'Feature Implementation'],
  ['7.4', 'Integration'],
  ['7.5', 'Testing'],
  ['7.6', 'Apply Summary'],
];
const applyRows = [...applyBlock.matchAll(/^\|\s*(7\.\d)\s*\|\s*([^|]+?)\s*\|/gm)].map((match) => [
  match[1].trim(),
  match[2].trim(),
]);
if (applyRows.length !== expectedApply.length) {
  fail(`Apply must contain exactly six nested substeps, found ${applyRows.length}`);
} else {
  expectedApply.forEach(([id, name], index) => {
    if (applyRows[index][0] !== id || applyRows[index][1] !== name) {
      fail(`Apply nested substep ${id} must be ${name}`);
    }
  });
}
if (!/Apply Summary is nested under Apply/i.test(texts.workflow)) {
  fail('workflow: Apply Summary nesting declaration is missing');
}
if (!/Workload Guard is a gate, not a\s*\n?phase/i.test(texts.workflow)) {
  fail('workflow: Workload Guard must be defined as a gate, not a phase');
}
if (!/Proposal, Spec, and Explore are not CRM lifecycle phases/i.test(texts.workflow)) {
  fail('workflow: Proposal, Spec, and Explore must be excluded from the lifecycle');
}

const requiredWorkflowTerms = [
  'Transition Graph',
  'PASS',
  'BLOCKED',
  'one retry',
  'Baseline Debt',
  'Bounded',
  'Apply Boundaries',
  'Hybrid Persistence Contract',
  'Terminal Maintainer Handoff',
  'Architecture Review',
];
requiredWorkflowTerms.forEach((term) => {
  if (!texts.workflow.toLowerCase().includes(term.toLowerCase())) {
    fail(`workflow: required semantic section or term missing: ${term}`);
  }
});

// The compatibility Guard must remain a pointer, never a competing state machine.
const guardMeta = frontmatter(texts.guard);
if (guardMeta?.classification !== 'COMPATIBILITY STUB' || guardMeta?.semantic_authority !== 'false') {
  fail('Workflow Guard must be a non-semantic COMPATIBILITY STUB');
}
if (!/Workflow semantics.*docs\/SDD-WORKFLOW\.md/s.test(texts.guard)) {
  fail('Workflow Guard must point workflow semantics to docs/SDD-WORKFLOW.md');
}
if (!/Mechanical enforcement.*scripts\/validate-sdd-direct\.mjs/s.test(texts.guard)) {
  fail('Workflow Guard must point mechanical enforcement to repository validators');
}
for (const forbidden of [/Transition Table/i, /Allowed next/i, /sole.*transition/i, /Direct Workflow/i, /^###?\s+Rule\s+\d+/im]) {
  if (forbidden.test(texts.guard)) fail('Workflow Guard contains competing lifecycle semantics');
}

// Execution adapter boundaries.
const directMeta = frontmatter(texts.direct);
if (directMeta?.classification !== 'EXECUTION ADAPTER' || directMeta?.semantic_authority !== 'false') {
  fail('Direct architecture must be a non-semantic EXECUTION ADAPTER');
}
if (!/WHAT.*lifecycle is.*WHEN.*transition is legal.*HOW.*gate is judged/s.test(texts.direct)) {
  fail('Direct architecture must explicitly defer WHAT and lifecycle semantics to the workflow');
}
if (!/project-local.*CRM-SDD lifecycle entry/i.test(texts.direct)) {
  fail('Direct architecture must identify the project-local CRM-SDD entry point');
}
if (/sole workflow|sole transition|Transition Table|Direct Workflow/i.test(texts.direct)) {
  fail('Direct architecture contains a competing workflow definition');
}

// Concrete model map and logical assignments.
if (!modelMap || modelMap.persistence !== 'hybrid') fail('model map: persistence must be hybrid');
const expectedRoles = {
  HIGH: ['ARCHITECT', 'openai/gpt-5.6-terra'],
  MID: ['BUILDER', 'openai/gpt-5.6-luna'],
  LOW: ['OPERATOR-EVIDENCE', 'longcat/LongCat-2.0'],
  HUMAN: ['MAINTAINER', null],
};
for (const [role, [name, model]] of Object.entries(expectedRoles)) {
  const actual = modelMap?.roles?.[role];
  if (!actual || actual.name !== name || actual.model !== model) {
    fail(`model map: ${role} must map to ${name} with model ${model ?? 'null'}`);
  }
}
const expectedPhaseRoles = {
  Design: 'HIGH',
  'Architecture Review': 'HIGH',
  'Design Refinement': 'HIGH',
  Tasks: 'MID',
  'Tasks Review': 'MID',
  'Tasks Refinement': 'MID',
  Apply: 'MID',
  'Apply 7.1 Foundation': 'MID',
  'Apply 7.2 Core Engine': 'MID',
  'Apply 7.3 Feature Implementation': 'MID',
  'Apply 7.4 Integration': 'MID',
  'Apply 7.5 Testing': 'MID',
  'Apply 7.6 Apply Summary': 'MID',
  Verify: 'HIGH',
  Archive: 'LOW',
  'Health Report': 'LOW',
  'Repository Ready': 'LOW',
  Commit: 'HUMAN',
  Push: 'HUMAN',
  Merge: 'HUMAN',
};
if (JSON.stringify(modelMap?.phase_roles) !== JSON.stringify(expectedPhaseRoles)) {
  fail('model map: phase-role assignments are not canonical');
}
const expectedAgentRoles = {
  'sdd-direct-orchestrator': 'MID',
  'sdd-direct-design': 'HIGH',
  'sdd-direct-architecture-review': 'HIGH',
  'sdd-direct-tasks': 'MID',
  'sdd-direct-tasks-review': 'MID',
  'sdd-direct-apply': 'MID',
  'sdd-direct-verify': 'HIGH',
  'sdd-direct-archive': 'LOW',
  'sdd-direct-health-report': 'LOW',
  'sdd-direct-repository-ready': 'LOW',
};
if (JSON.stringify(modelMap?.local_agent_roles) !== JSON.stringify(expectedAgentRoles)) {
  fail('model map: local-agent role assignments are not canonical');
}

const actualAgentFiles = readdirSync(pathOf('.opencode', 'agents'))
  .filter((name) => /^sdd-direct-.*\.md$/.test(name))
  .map((name) => name.replace(/\.md$/, ''))
  .sort();
if (JSON.stringify(actualAgentFiles) !== JSON.stringify([...localAgentNames].sort())) {
  fail('local Direct agent set contains a missing or undefined canonical executor');
}
for (const [name, expectedRole] of Object.entries(expectedAgentRoles)) {
  const parsed = frontmatter(localAgentTexts[name]);
  const expectedModel = expectedRoles[expectedRole][1];
  if (!parsed || !parsed.description || parsed.mode !== (name === 'sdd-direct-orchestrator' ? 'primary' : 'subagent')) {
    fail(`${name}: invalid mode or description`);
  }
  if (parsed?.model !== expectedModel) {
    fail(`${name}: model binding does not match the canonical ${expectedRole} mapping`);
  }
}

const commandMeta = frontmatter(texts.command);
if (!commandMeta || commandMeta.agent !== 'sdd-direct-orchestrator') {
  fail('local Direct command must route to the defined local orchestrator');
}
if (!texts.command.includes('openspec/changes/<change-name>/')) {
  fail('local Direct command must use the canonical change path');
}
if (/Use the shared Workflow Guard Direct-mode section|global SDD|Gentle-AI/i.test(texts.command)) {
  fail('local Direct command contains legacy or global routing instructions');
}
for (const [name, text] of Object.entries(legacyCommandTexts)) {
  const parsed = frontmatter(text);
  if (!parsed || parsed.agent !== 'sdd-direct-orchestrator' || !/CRM_SDD_LEGACY_BOUNDARY/.test(text) || !/STOP/.test(text)) {
    fail(`${name}: project-local compatibility stub is missing or can route a legacy lifecycle`);
  }
}

// Project-local OpenCode config must override the observed global runtime path.
const globalAgents = [
  'sdd-apply',
  'sdd-apply-pro',
  'sdd-archive',
  'sdd-design',
  'sdd-explore',
  'sdd-init',
  'sdd-onboard',
  'sdd-propose',
  'sdd-spec',
  'sdd-tasks',
  'sdd-verify',
  'sdd-judge-a',
  'sdd-judge-b',
  'sdd-fix',
  'sdd-architecture-review',
  'sdd-tasks-review',
  'sdd-health',
  'sdd-repository-ready',
  'sdd-orchestrator',
  'gentle-orchestrator',
];
if (projectConfig?.default_agent !== 'sdd-direct-orchestrator') {
  fail('opencode.json: default_agent must be sdd-direct-orchestrator');
}
for (const name of globalAgents) {
  if (projectConfig?.agent?.[name]?.disable !== true) {
    fail(`opencode.json: conflicting global agent ${name} must be disabled`);
  }
}
for (const name of legacyCommandNames) {
  const command = projectConfig?.command?.[name];
  if (!command || command.agent !== 'sdd-direct-orchestrator' || !/CRM_SDD_LEGACY_BOUNDARY/.test(command.template || '') || !/STOP/.test(command.template || '')) {
    fail(`opencode.json: ${name} must be a STOP-only legacy compatibility stub`);
  }
}

const localRuntimeText = [texts.command, ...Object.values(localAgentTexts), ...Object.values(legacyCommandTexts)].join('\n');
if (/\bsdd-(?!direct-)(?:apply|apply-pro|archive|design|explore|init|onboard|propose|spec|tasks|verify|judge-a|judge-b|fix|architecture-review|tasks-review|health|repository-ready|orchestrator)\b/.test(localRuntimeText)) {
  fail('project-local Direct wiring references a global/non-Direct SDD executor');
}
if (/~\/\.config\/opencode|Gentle-AI|Gentle AI/i.test(localRuntimeText)) {
  fail('project-local Direct wiring contains a global Gentle runtime route');
}

// Active auxiliary documents cannot claim the old authority chain or mapping.
if (/Status:\s*Active operating brief|Current Assignments|Configuration Source/i.test(texts.modelHistory)) {
  fail('historical model assignment brief still claims active authority');
}
for (const historical of [
  pathOf('docs', 'templates', 'architecture-review-prompt.md'),
  pathOf('docs', 'templates', 'design-refinement-prompt.md'),
  pathOf('docs', 'templates', 'tasks-prompt.md'),
  pathOf('docs', 'templates', 'tasks-review-prompt.md'),
  pathOf('docs', 'templates', 'tasks-refinement-prompt.md'),
]) {
  const marker = frontmatter(read(historical) || '');
  if (marker?.classification !== 'HISTORICAL' || marker?.runtime !== 'not-loaded') {
    fail(`${relativePath(historical)} must be explicitly historical and non-runtime`);
  }
}
if (/phase_rules:|model_code:|model_planning:/i.test(texts.config)) {
  fail('openspec/config.yaml contains stale phase or concrete model routing');
}
if (/docs\/SDD-MODEL-ASSIGNMENTS\.md/.test(texts.agents + texts.workflow + texts.direct + texts.config)) {
  fail('active governance points to the historical model assignment brief');
}
if (/artifact_store\s*:\s*(?:both|engram|openspec)\b|persistence\s*:\s*(?:both|engram|openspec)\b|mode\s*:\s*(?:both|engram|openspec)\b/i.test(
  [
    texts.agents,
    texts.workflow,
    texts.guard,
    texts.direct,
    texts.infrastructure,
    texts.baseline,
    texts.project,
    texts.session,
    texts.decisions,
    texts.issues,
    texts.roadmap,
    texts.config,
    texts.template,
    texts.command,
    ...Object.values(localAgentTexts),
  ].join('\n'),
)) {
  fail('active governance contains a non-hybrid persistence value');
}
if (!/artifact_store:\s*hybrid/i.test(texts.config) || !/persistence:\s*hybrid/i.test(texts.workflow)) {
  fail('hybrid persistence contract is missing from canonical config or workflow');
}

// Terminal phases must remain maintainer-only in the canonical map and workflow.
for (const phase of ['Commit', 'Push', 'Merge']) {
  if (modelMap?.phase_roles?.[phase] !== 'HUMAN') fail(`${phase}: terminal phase must be HUMAN-owned`);
}
if (!/Commit, Push, and Merge are user-facing lifecycle\s+phases\s+but\s+are HUMAN \/ MAINTAINER-only/is.test(texts.workflow)) {
  fail('workflow: terminal Git phases must be explicitly maintainer-only');
}
if (!/Do not\s+commit,\s*push,\s*merge,\s*release,\s*or\s*tag/i.test(texts.command)) {
  fail('local Direct command must prohibit maintainer Git operations');
}
if (!/sdd-runtime|runtime bootstrap/i.test(texts.command) || !/Repository Ready|autonomous dispatch/i.test(texts.command)) {
  fail('local Direct command must declare runtime bootstrap and autonomous dispatch boundary');
}
if (!/sdd-runtime|runtime state/i.test(texts.resumeCommand) || !/corrupt runtime state.*STOP|runtime state.*STOP/i.test(texts.resumeCommand)) {
  fail('local Resume command must validate runtime state and stop on corruption');
}
if (!existsSync(files.runtime)) fail('scripts/sdd-runtime.mjs: runtime implementation is missing');
if (modelMap?.runtime_routing?.fallback_policy !== 'same-role-compatible-only' || modelMap?.runtime_routing?.exhaustion !== 'STOP/HUMAN_HANDOFF') {
  fail('model map: runtime fallback metadata must preserve same-role fail-closed routing');
}
if (!localAgentTexts['sdd-direct-orchestrator']?.includes('sdd-runtime.mjs')) {
  fail('orchestrator: runtime bootstrap wiring is missing');
}

// Package-level entry points are required and must remain governance-only.
if (packageJson?.scripts?.['sdd:validate'] !== 'node scripts/validate-sdd-direct.mjs') {
  fail('package.json: pnpm sdd:validate entry point is missing');
}
if (packageJson?.scripts?.['sdd:validate:design'] !== 'node scripts/validate-enterprise-design.mjs') {
  fail('package.json: pnpm sdd:validate:design entry point is missing');
}
if (!/18 sections/i.test(texts.template) || !/(A-G|7 AR topics)/i.test(texts.template)) {
  fail('Enterprise Design template does not advertise the stable 18-section/A-G shape');
}

if (failures.length) {
  console.error('CRM-SDD governance validation: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('CRM-SDD governance validation: PASS');
  console.log('- canonical files and classifications are valid');
  console.log('- exactly 14 phases and nested Apply 7.1-7.6 are valid');
  console.log('- workflow authority and non-semantic Guard boundary are valid');
  console.log('- local Direct wiring, legacy STOP stubs, and agent bindings are valid');
  console.log('- logical role map, hybrid persistence, and maintainer gates are valid');
  console.log('- package-level validators and Enterprise template boundary are valid');
}
