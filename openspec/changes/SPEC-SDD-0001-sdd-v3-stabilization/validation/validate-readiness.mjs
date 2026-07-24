import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const changeRoot = new URL('../', import.meta.url);
const defaults = {
  reviewPath: fileURLToPath(new URL('evidence/architecture-review-approved.md', changeRoot)),
  reportPath: fileURLToPath(new URL('evidence/readiness-report.md', changeRoot)),
};
const legacyBaseline = 'PASS_WITH_LEGACY_BASELINE';
const pass = 'PASS';

function parseRows(report) {
  return report.split('\n')
    .filter((line) => /^\| R-\d{2} \|/.test(line))
    .map((line) => {
      const [gate, status, observedValue, owner] = line.split('|').slice(1, -1)
        .map((cell) => cell.trim());
      return { gate, status, observedValue, owner };
    });
}

export async function validateReadiness(paths = defaults) {
  const [review, report] = await Promise.all([
    readFile(paths.reviewPath, 'utf8'),
    readFile(paths.reportPath, 'utf8'),
  ]);
  const failures = [];
  const rows = parseRows(report);

  if (!report.includes('Overall: READY WITH LEGACY BASELINE')) failures.push('readiness report must declare READY WITH LEGACY BASELINE');
  for (let number = 1; number <= 12; number += 1) {
    const gate = `R-${String(number).padStart(2, '0')}`;
    const matchingRows = rows.filter((row) => row.gate === gate);
    if (matchingRows.length !== 1) {
      failures.push(`${gate} must appear exactly once`);
      continue;
    }
    const row = matchingRows[0];
    if (!row.status || !row.observedValue || !row.owner) {
      failures.push(`${gate} must include status, observed value, and owner`);
    }
  }
  for (const gate of ['R-01', 'R-12']) {
    const row = rows.find((candidate) => candidate.gate === gate);
    if (![legacyBaseline, pass].includes(row?.status)) {
      failures.push(`${gate} must be ${legacyBaseline} for pre-v3.0 or ${pass} for v3.0+`);
    }
  }
  if (!report.includes('Legacy Baseline Exception')) failures.push('readiness report must reference the Legacy Baseline Exception');
  const r07 = rows.find((row) => row.gate === 'R-07');
  if (!review.includes('Verdict: APPROVED') || r07?.status !== 'PASS') {
    failures.push('R-07 requires architecture review Verdict: APPROVED');
  }
  return failures;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const failures = await validateReadiness();
  if (failures.length > 0) {
    console.error(`FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    console.log('PASS: readiness validation (legacy baseline accepted; v3.0+ remains strict)');
  }
}
