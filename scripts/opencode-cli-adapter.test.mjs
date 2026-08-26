import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FAILURE_CLASSES,
  createInvocationKey,
  createCliAdapter,
  parseJsonEvents,
  parseExport,
  validateSemanticPacket,
  recoverInterruptedInvocation,
  createBoundedLineCapture,
  createMachineCapture,
  EXPORT_MACHINE_CAPTURE_LIMIT,
} from './opencode-cli-adapter.mjs';

const request = (overrides = {}) => ({
  change: 'sdd-opencode-structured-message-recovery', action: 'Apply 7.5 Testing',
  phase: 'Apply 7.5 Testing', requiredRole: 'MID', capability: 'implementation',
  directory: '/tmp/crm', agent: 'sdd-direct-orchestrator', provider: 'openai',
  model: 'gpt-5.6-luna', prompt: '{"change":"sdd-opencode-structured-message-recovery","action":"Apply 7.5 Testing","role":"MID","status":"PASS","artifacts":[],"evidence":["ok"],"next":"Apply 7.6 Apply Summary"}',
  ...overrides,
});

const exportPayload = (text, identity = {}) => ({ info: { id: 'ses_1', ...identity }, messages: [
  { info: { id: 'msg_user', role: 'user', agent: 'sdd-direct-orchestrator', model: { providerID: 'openai', modelID: 'gpt-5.6-luna' }, time: { created: 1000 } }, parts: [{ type: 'text', text: 'prompt' }] },
  { info: { id: 'msg_assistant', role: 'assistant', agent: 'sdd-direct-orchestrator', providerID: 'openai', modelID: 'gpt-5.6-luna', time: { created: 1001, completed: 1002 }, finish: 'stop', tokens: { input: 3, output: 4, reasoning: 2, total: 9, cacheRead: 5, cacheWrite: 6 }, cost: 0.12, ...identity }, parts: [{ type: 'text', text }] },
] });

test('derives stable invocation keys and exact CLI argv', async () => {
  assert.equal(createInvocationKey(request()), createInvocationKey(request()));
  const calls = [];
  const adapter = createCliAdapter({
    spawn: (cmd, args) => { calls.push([cmd, args]); return fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })); },
    exportCommand: async () => JSON.stringify(exportPayload(request().prompt)),
  });
  await adapter.execute(request());
  assert.deepEqual(calls[0], ['opencode', ['run', '--dir', '/tmp/crm', '--agent', 'sdd-direct-orchestrator', '--model', 'openai/gpt-5.6-luna', '--format', 'json', request().prompt]]);
});

test('captures PID, bounded output, timestamps, duration, and exit evidence', async () => {
  const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(exportPayload(request().prompt)) }).execute(request());
  assert.equal(result.evidence.pid, 4321); assert.equal(result.evidence.exit_code, 0); assert.ok(result.evidence.started_at); assert.ok(result.evidence.ended_at); assert.equal(typeof result.evidence.duration_ms, 'number');
});

test('bounds captured NDJSON only at complete line boundaries', () => {
  const capture = createBoundedLineCapture(96);
  capture.append(`${JSON.stringify({ type: 'text', part: { sessionID: 'ses_1', text: 'x'.repeat(100) } })}\n`);
  capture.append(`${JSON.stringify({ type: 'step_finish', sessionID: 'ses_1' })}\n`);
  const result = capture.finish();
  assert.equal(result.truncated, true);
  assert.doesNotThrow(() => parseJsonEvents(result.value));
  assert.equal(parseJsonEvents(result.value).sessionID, 'ses_1');
});

test('bounded large CLI output is reported as truncation, not synthetic JSON failure', async () => {
  const output = `${JSON.stringify({ type: 'text', part: { sessionID: 'ses_1', text: 'x'.repeat(20000) } })}\n${JSON.stringify({ type: 'step_finish', sessionID: 'ses_1' })}\n`;
  const result = await createCliAdapter({ spawn: () => fakeChild(0, output), exportCommand: async () => JSON.stringify(exportPayload(request().prompt)) }).execute(request({ prompt: `${request().prompt}-large` }));
  assert.equal(result.status, 'COMPLETED_SUCCESS'); assert.equal(result.evidence.capture_truncated, true); assert.equal(result.evidence.stdout_truncated, true);
});

test('genuinely malformed complete NDJSON remains a JSON event error', () => {
  const capture = createBoundedLineCapture(64);
  capture.append('{"type":"text","part":}\n');
  const result = capture.finish();
  assert.equal(result.truncated, false);
  assert.throws(() => parseJsonEvents(result.value), /CLI_JSON_EVENT_ERROR/);
});

test('coalesces active duplicates and consumes completed results once', async () => {
  let release; const gate = new Promise((resolve) => { release = resolve; }); let count = 0;
  const adapter = createCliAdapter({ spawn: () => { count += 1; return fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' }), gate); }, exportCommand: async () => JSON.stringify(exportPayload(request().prompt)) });
  const first = adapter.execute(request()); const second = adapter.execute(request()); assert.strictEqual(first, second); release();
  const result = await first; assert.equal(result.status, 'COMPLETED_SUCCESS'); assert.equal(count, 1);
  assert.throws(() => adapter.execute(request()), /completed result already consumed/);
});

test('parses supported events, requires consistent session ID, and strictly validates result', () => {
  const parsed = parseJsonEvents(`${JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })}\n${JSON.stringify({ type: 'text', sessionID: 'ses_1', text: 'hello' })}\n${JSON.stringify({ type: 'step_finish', sessionID: 'ses_1' })}`);
  assert.equal(parsed.sessionID, 'ses_1'); assert.equal(parsed.summary.text_events, 1);
  const nested = parseJsonEvents(`${JSON.stringify({ type: 'step_start', part: { sessionID: 'ses_nested' } })}\n${JSON.stringify({ type: 'text', part: { sessionID: 'ses_nested', text: 'nested' } })}`);
  assert.equal(nested.sessionID, 'ses_nested'); assert.equal(nested.text, 'nested');
  assert.throws(() => parseJsonEvents(`${JSON.stringify({ type: 'text', sessionID: 'ses_1' })}\n${JSON.stringify({ type: 'text', sessionID: 'ses_2' })}`), /consistent/);
  assert.deepEqual(validateSemanticPacket(request().prompt, request()), JSON.parse(request().prompt));
  assert.throws(() => validateSemanticPacket('prose', request()), /MALFORMED_RESULT/);
});

test('gates export on a known consistent session ID', async () => {
  let exports = 0;
  const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start' })), exportCommand: async () => { exports += 1; return JSON.stringify(exportPayload(request().prompt)); } }).execute(request({ prompt: `${request().prompt}-no-session` }));
  assert.equal(result.status, 'SESSION_ID_UNAVAILABLE'); assert.equal(exports, 0);
});

test('parses complete export JSON larger than the diagnostic limit', async () => {
  const large = exportPayload(request().prompt);
  large.messages[0].parts[0].text = 'u'.repeat(5000);
  const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(large) }).execute(request({ prompt: `${request().prompt}-large-export` }));
  assert.equal(result.status, 'COMPLETED_SUCCESS'); assert.ok(result.evidence.export_size > 4000);
});

test('parses the complete OpenCode export envelope with structured message parts', () => {
  const exportValue = {
    info: { id: 'ses_1', agent: 'sdd-direct-orchestrator', model: { providerID: 'openai', modelID: 'gpt-5.6-luna' } },
    messages: [
      { info: { id: 'msg_user', role: 'user', agent: 'sdd-direct-orchestrator' }, parts: [{ type: 'text', text: 'prompt' }] },
      { info: {
        id: 'msg_assistant', role: 'assistant', mode: 'primary', agent: 'sdd-direct-orchestrator',
        providerID: 'openai', modelID: 'gpt-5.6-luna', finish: 'stop',
        time: { created: 1001, completed: 1002 },
        tokens: { input: 3, output: 4, reasoning: 2, total: 9, cache: { read: 5, write: 6 } },
      }, parts: [
        { type: 'step-start' },
        { type: 'reasoning', text: 'bounded internal reasoning' },
        { type: 'text', text: request().prompt },
        { type: 'step-finish' },
      ] },
    ],
  };

  const parsed = parseExport(JSON.stringify(exportValue, null, 2));
  assert.deepEqual(parsed.runtime, { agent: 'sdd-direct-orchestrator', providerID: 'openai', modelID: 'gpt-5.6-luna' });
  assert.equal(parsed.terminalText, request().prompt);
  assert.equal(parsed.metrics.completed, true);
  assert.equal(parsed.metrics.tokens.cacheRead, 5);
  assert.equal(parsed.metrics.tokens.cacheWrite, 6);
});

test('keeps complete machine export input separate from bounded diagnostics', () => {
  const capture = createMachineCapture(32); capture.append('x'.repeat(100)); const result = capture.finish();
  assert.equal(result.overflow, true); assert.equal(result.size, 100); assert.ok(result.diagnostic.length <= 4000);
});

test('classifies malformed export JSON and shape deterministically', async () => {
  for (const value of ['{"info":', JSON.stringify({ info: {}, messages: {} })]) {
    const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => value }).execute(request({ prompt: `${request().prompt}-${value.length}` }));
    assert.equal(result.status, 'SESSION_EXPORT_MALFORMED_JSON');
  }
});

test('classifies explicit export machine overflow before parsing', async () => {
  const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => ({ stdout: '{}', stdoutSize: EXPORT_MACHINE_CAPTURE_LIMIT + 1, overflow: true, stderr: '' }) }).execute(request({ prompt: `${request().prompt}-overflow` }));
  assert.equal(result.status, 'SESSION_EXPORT_CAPTURE_OVERFLOW');
});

test('classifies export command spawn and nonzero failures distinctly', async () => {
  const spawnFailure = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => ({ commandFailure: true, spawnError: 'ENOENT' }) }).execute(request({ prompt: `${request().prompt}-export-spawn` }));
  const nonzero = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => ({ exitCode: 2, stdout: '', stderr: 'failed' }) }).execute(request({ prompt: `${request().prompt}-export-exit` }));
  assert.equal(spawnFailure.status, 'SESSION_EXPORT_COMMAND_FAILURE'); assert.equal(nonzero.status, 'SESSION_EXPORT_COMMAND_FAILURE'); assert.equal(nonzero.evidence.export_exit_code, 2);
});

test('reports missing persisted export identity without substituting requested identity', async () => {
  const payload = exportPayload(request().prompt); delete payload.messages[1].info.agent; delete payload.messages[1].info.providerID; delete payload.messages[1].info.modelID;
  const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(payload) }).execute(request({ prompt: `${request().prompt}-missing-identity` }));
  assert.equal(result.status, 'SESSION_EXPORT_IDENTITY_MISSING'); assert.equal(result.evidence.persisted_runtime, undefined);
});

test('exports only after exit, recovers identity/metrics, and rejects HIGH identity mismatch', async () => {
  const order = []; const adapter = createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' }), undefined, () => order.push('exit')), exportCommand: async (id) => { order.push(`export:${id}`); const stdout = JSON.stringify(exportPayload(request().prompt)); return { stdout, exitCode: 0, stdoutSize: stdout.length }; } });
  const result = await adapter.execute(request()); assert.deepEqual(order, ['exit', 'export:ses_1']); assert.equal(result.evidence.export_exit_code, 0); assert.deepEqual(result.evidence.metrics, { duration_ms: 1, tokens: { input: 3, output: 4, reasoning: 2, total: 9, cacheRead: 5, cacheWrite: 6 }, cost: 0.12, finish: 'stop', completed: true });
  const mismatch = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(exportPayload(request().prompt, { agent: 'low-evidence-primary' })) }).execute(request({ requiredRole: 'HIGH', phase: 'Verify', action: 'Verify', prompt: request().prompt.replace('"role":"MID"', '"role":"HIGH"') }));
  assert.equal(mismatch.status, 'RUNTIME_IDENTITY_MISMATCH');
});

test('returns spawn failure for synchronous and child-emitted spawn errors', async () => {
  const thrown = await createCliAdapter({ spawn: () => { throw new Error('ENOENT'); } }).execute(request());
  assert.equal(thrown.status, 'CLI_SPAWN_FAILURE');
  const emitted = await createCliAdapter({ spawn: () => errorChild(new Error('launch failed')) }).execute(request());
  assert.equal(emitted.status, 'CLI_SPAWN_FAILURE');
});

test('failed invocations can be retried while successful results remain consumed once', async () => {
  let attempts = 0;
  const adapter = createCliAdapter({ spawn: () => { attempts += 1; return fakeChild(attempts === 1 ? 1 : 0, attempts === 1 ? '' : JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })); }, exportCommand: async () => JSON.stringify(exportPayload(request().prompt)) });
  assert.equal((await adapter.execute(request())).status, 'CLI_NONZERO_EXIT');
  assert.equal((await adapter.execute(request())).status, 'COMPLETED_SUCCESS');
  assert.throws(() => adapter.execute(request()), /completed result already consumed/);
});

test('exit zero without a valid packet is never PASS and failures are conservative', async () => {
  for (const [stderr, expected] of [['', 'EMPTY_RESULT'], ['provider unavailable', 'PROVIDER_UNAVAILABLE'], ['quota exhausted', 'QUOTA_EXHAUSTED']]) {
    const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' }), undefined, undefined, stderr), exportCommand: async () => JSON.stringify(exportPayload(expected === 'EMPTY_RESULT' ? '' : request().prompt)) }).execute(request());
    assert.equal(result.status, expected);
  }
  assert.ok(FAILURE_CLASSES.includes('EXECUTOR_ERROR'));
});

test('rejects malformed strict packets and preserves redaction boundaries', async () => {
  const malformed = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(exportPayload('```json\n{}\n```')) }).execute(request({ prompt: `${request().prompt}-fenced` }));
  assert.equal(malformed.status, 'MALFORMED_RESULT');
  const exportReport = parseExport(JSON.stringify(exportPayload('{"ok":true}')));
  assert.equal(exportReport.metrics.tokens.reasoning, 2); assert.equal(exportReport.metrics.completed, true);
});

test('interruption recovery passes only with proven completed export', async () => {
  let exportedSession;
  const recovered = await recoverInterruptedInvocation({ ...request(), invocationKey: createInvocationKey(request()), sessionID: 'ses_1', completed: false }, { exportCommand: async (sessionID) => { exportedSession = sessionID; return JSON.stringify(exportPayload(request().prompt)); } });
  assert.equal(recovered.status, 'COMPLETED_SUCCESS');
  assert.equal(exportedSession, 'ses_1');
  const failed = await recoverInterruptedInvocation({ ...request(), invocationKey: createInvocationKey(request()), sessionID: 'ses_1', completed: false }, { exportCommand: async () => { throw new Error('not persisted'); } });
  assert.equal(failed.status, 'SESSION_EXPORT_COMMAND_FAILURE');
  const unknown = await recoverInterruptedInvocation({ ...request(), invocationKey: createInvocationKey(request()) }, { exportCommand: async () => { throw new Error('must not run'); } });
  assert.equal(unknown.status, 'SESSION_ID_UNAVAILABLE');
});

test('enforces canonical HIGH authority and accepts a valid HIGH executor identity', async () => {
  const highRequest = request({ action: 'Verify', phase: 'Verify', requiredRole: 'HIGH', agent: 'sdd-direct-verify', provider: 'openai', model: 'gpt-5.6-terra', prompt: '{"change":"sdd-opencode-structured-message-recovery","action":"Verify","role":"HIGH","status":"PASS","artifacts":[],"evidence":["ok"],"next":"Archive"}' });
  const valid = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', part: { sessionID: 'ses_1' } })), exportCommand: async () => JSON.stringify(exportPayload(highRequest.prompt, { agent: 'sdd-direct-verify', providerID: 'openai', modelID: 'gpt-5.6-terra' })) }).execute(highRequest);
  assert.equal(valid.status, 'COMPLETED_SUCCESS');
  const downgraded = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(exportPayload(highRequest.prompt, { agent: 'sdd-direct-orchestrator', providerID: 'openai', modelID: 'gpt-5.6-luna' })) }).execute(highRequest);
  assert.equal(downgraded.status, 'RUNTIME_IDENTITY_MISMATCH');
});

test('permits an explicitly injected HIGH authority identity without inferring it from request fields', async () => {
  const highRequest = request({ action: 'Verify', phase: 'Verify', requiredRole: 'HIGH', authorityIdentity: { agent: 'custom-high', providerID: 'custom', modelID: 'model' }, agent: 'custom-high', provider: 'custom', model: 'model', prompt: '{"change":"sdd-opencode-structured-message-recovery","action":"Verify","role":"HIGH","status":"PASS","artifacts":[],"evidence":["ok"],"next":"Archive"}' });
  const result = await createCliAdapter({ spawn: () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' })), exportCommand: async () => JSON.stringify(exportPayload(highRequest.prompt, { agent: 'custom-high', providerID: 'custom', modelID: 'model' })) }).execute(highRequest);
  assert.equal(result.status, 'COMPLETED_SUCCESS');
});

test('distinguishes the required evidence failure classes', async () => {
  const cases = [
    ['event', 'CLI_JSON_EVENT_ERROR', () => fakeChild(0, 'not-json')],
    ['session', 'SESSION_ID_UNAVAILABLE', () => fakeChild(0, JSON.stringify({ type: 'step_start' }))],
    ['export', 'SESSION_EXPORT_COMMAND_FAILURE', () => fakeChild(0, JSON.stringify({ type: 'step_start', sessionID: 'ses_1' }))],
    ['nonzero', 'CLI_NONZERO_EXIT', () => fakeChild(2, '')],
  ];
  for (const [kind, expected, spawn] of cases) {
    const result = await createCliAdapter({ spawn, exportCommand: async () => { if (kind === 'export') throw new Error('bad export'); return JSON.stringify(exportPayload(request().prompt)); } }).execute(request({ prompt: `${request().prompt}-${kind}` }));
    assert.equal(result.status, expected);
  }
});

test('classifies an explicit executor recovery error separately from export failure', async () => {
  const result = await recoverInterruptedInvocation({ ...request(), sessionID: 'ses_1', invocationKey: 'key' }, { exportCommand: async () => { throw new Error('EXECUTOR_ERROR: parent context unavailable'); } });
  assert.equal(result.status, 'EXECUTOR_ERROR');
});

test('adapter source has no alternate semantic execution plane', async () => {
  const source = await readFile(new URL('./opencode-cli-adapter.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /opencode\s+serve|session\.prompt|promptAsync|event\.subscribe|session polling/i);
  assert.match(source, /opencode.*run/); assert.match(source, /opencode.*export/);
});

function fakeChild(code, stdout, gate, onExit, stderr = '') {
  const listeners = {}; const child = { pid: 4321, stdout: stream(stdout), stderr: stream(stderr), on: (event, fn) => { listeners[event] = fn; if (event === 'close') Promise.resolve(gate).then(() => { onExit?.(); fn(code); }); return child; } };
  return child;
}
function errorChild(error) { const child = { pid: 4321, stdout: stream(''), stderr: stream(''), on: (event, fn) => { if (event === 'error') queueMicrotask(() => fn(error)); return child; } }; return child; }
function stream(value) { return { on: (event, fn) => { if (event === 'data') queueMicrotask(() => fn(Buffer.from(value))); return this; } }; }
