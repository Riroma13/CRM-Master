#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requested = process.argv.slice(2).find((argument) => argument !== '--');
const failures = [];
const fail = (message) => failures.push(message);

if (!requested) {
  fail('usage: pnpm sdd:validate:design -- <design-path>');
}

let designPath;
if (requested) {
  const candidate = isAbsolute(requested) ? requested : resolve(ROOT, requested);
  const rel = relative(ROOT, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    fail('design path must be inside the repository');
  }
  if (/SPEC-0028(?:-|\/|$)/i.test(rel)) {
    fail('SPEC-0028 is protected and is not read by this validator');
  }
  designPath = candidate;
  if (!existsSync(candidate)) fail(`missing design: ${rel}`);
}

const text = designPath && existsSync(designPath) ? readFileSync(designPath, 'utf8') : '';
const displayPath = designPath ? relative(ROOT, designPath) : '<none>';

function sectionBetween(startPattern, endPattern) {
  const start = text.search(startPattern);
  if (start < 0) return '';
  const afterStart = text.slice(start);
  const end = endPattern ? afterStart.search(endPattern) : -1;
  return end < 0 ? afterStart : afterStart.slice(0, end);
}

// Stable Enterprise Design shape: numbered sections must be exact and ordered.
const expectedSections = [
  'Executive Summary',
  'Technical Approach',
  'Architecture Decisions',
  'Data Flow',
  'Working Set',
  'Read Order',
  'Expected Commands',
  'Design Confidence',
  'Exploration Budget',
  'Risks',
  'Testing Strategy',
  'Doorbell Tests',
  'Required ADRs',
  'Boundaries',
  'Extensibility',
  'Interfaces / Contracts',
  'Migration Strategy',
  'Open Questions',
];

const sections = [...text.matchAll(/^##\s+(\d+)\.\s+(.+?)\s*$/gm)].map((match) => ({
  number: Number(match[1]),
  title: match[2],
}));
if (sections.length !== expectedSections.length) {
  fail(`expected exactly 18 numbered sections, found ${sections.length}`);
} else {
  sections.forEach((section, index) => {
    if (section.number !== index + 1 || section.title !== expectedSections[index]) {
      fail(`section ${index + 1} must be "${expectedSections[index]}"`);
    }
  });
}

// Architecture Review shape: exactly the stable A-G topics.
const arSection = sectionBetween(
  /^##\s+Architecture Review Preparation\b.*$/m,
  /^##\s+16\.\s+/m,
);
const expectedTopics = [
  'Scalability',
  'Open/Closed Principle (OCP)',
  'Ownership',
  'Data Retention',
  'Idempotency',
  'Shared Contracts',
  'Partitioning Strategy',
];
const topics = [...arSection.matchAll(/^###\s+([A-G])\.\s+(.+?)\s*$/gm)].map((match) => ({
  letter: match[1],
  title: match[2],
}));
if (topics.length !== expectedTopics.length) {
  fail(`expected exactly 7 A-G Architecture Review topics, found ${topics.length}`);
} else {
  topics.forEach((topic, index) => {
    if (topic.letter !== String.fromCharCode(65 + index) || topic.title !== expectedTopics[index]) {
      fail(`Architecture Review topic ${String.fromCharCode(65 + index)} is not canonical`);
    }
  });
}

// Decision and rationale must remain separate in the structurally defined areas.
const architectureDecisions = sectionBetween(/^##\s+3\.\s+Architecture Decisions\s*$/m, /^##\s+4\.\s+/m);
if (!/\bDecision\b/i.test(architectureDecisions) || !/\bRationale\b/i.test(architectureDecisions)) {
  fail('Architecture Decisions must separate Decision and Rationale');
}
const topicHeaders = [...arSection.matchAll(/^###\s+([A-G])\.\s+.+?\s*$/gm)];
for (const [index, topic] of topics.entries()) {
  const topicBody = arSection.slice(
    topicHeaders[index]?.index ?? 0,
    topicHeaders[index + 1]?.index ?? arSection.length,
  );
  if (!/\*\*Decision:\*\*/.test(topicBody) || !/\*\*Rationale:\*\*/.test(topicBody)) {
    fail(`Architecture Review topic ${topic.letter} must separate Decision and Rationale`);
  }
}

// Working Set tables must be present and their numbered rows must be contiguous.
const workingSet = sectionBetween(/^##\s+5\.\s+Working Set\s*$/m, /^##\s+6\.\s+/m);
const primary = sectionBetween(/^###\s+5\.1\s+Primary Files\s*$/m, /^###\s+5\.2\s+/m);
const secondary = sectionBetween(/^###\s+5.2\s+Secondary Files\s*$/m, /^###\s+5.3\s+/m);
if (!primary || !secondary || !/^###\s+5\.3\s+Expected NOT to Change\s*$/m.test(workingSet)) {
  fail('Working Set must contain Primary Files, Secondary Files, and Expected NOT to Change');
}

function checkNumberedRows(label, value) {
  const numbers = [...value.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((match) => Number(match[1]));
  numbers.forEach((number, index) => {
    if (number !== index + 1) fail(`${label} rows must be numbered consecutively from 1`);
  });
}
checkNumberedRows('Primary Files', primary);
checkNumberedRows('Secondary Files', secondary);

const primaryCount = [...primary.matchAll(/\|\s*(\d+)\s*\|/gm)].length;
const secondaryCount = [...secondary.matchAll(/\|\s*(\d+)\s*\|/gm)].length;
for (const match of workingSet.matchAll(/\b(primary|secondary|working\s*set)\s+(?:file\s+)?(?:count|total)\s*[:=]\s*(\d+)/gi)) {
  const declared = Number(match[2]);
  const actual = match[1].toLowerCase().startsWith('primary')
    ? primaryCount
    : match[1].toLowerCase().startsWith('secondary')
      ? secondaryCount
      : primaryCount + secondaryCount;
  if (declared !== actual) fail(`${match[1]} count ${declared} does not match ${actual} numbered rows`);
}

if (failures.length) {
  console.error(`Enterprise Design validation: FAIL (${displayPath})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Enterprise Design validation: PASS (${displayPath})`);
  console.log('- 18 numbered sections are present in canonical order');
  console.log('- A-G Architecture Review topics are present in canonical order');
  console.log('- Decision/Rationale separation is present where required');
  console.log('- Working Set structure and machine-checkable numbering are consistent');
}
