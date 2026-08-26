import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ROOT_CAUSE_CLASSES, buildSdkPromptAsyncRequest, buildHttpListRequest, buildHttpExactRequest,
  buildHttpPromptAsyncRequest, fingerprintAndDisposeSchema, createVersionSnapshot,
  classifyRootCause, classifyRecoveryObservation, createRecoveryTransport, extractAssistantMessage,
  createProbeReport, redactDiagnostic, assertProbeIsolation, aggregateProbeObservations,
  runMalformedSchemaControl,
} from './opencode-structured-message-recovery.mjs';

const identity = { providerID: 'provider-x', modelID: 'model-y' };
const parts = [{ type: 'text', text: 'return a bounded result' }];

test('retains only deterministic request and evidence utilities; semantic SDK/server plane is retired', async () => {
  const source = await readFile(new URL('./opencode-structured-message-recovery.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /createOpencode|event\.subscribe|session\.prompt|opencode\s+serve|fetch\(/i);
  assert.match(source, /Semantic recovery uses scripts\/opencode-cli-adapter\.mjs only/);
});

test('builds flattened SDK and separate HTTP transport shapes', () => {
  const request = buildSdkPromptAsyncRequest({ sessionID: 'ses_1', messageID: 'msg_1', model: identity, agent: 'default', format: { type: 'json_schema', schema: { type: 'object' } }, parts });
  assert.equal('path' in request, false); assert.equal('body' in request, false);
  assert.deepEqual(buildHttpListRequest('ses_1'), { method: 'GET', path: '/session/ses_1/message', body: undefined });
  assert.deepEqual(buildHttpExactRequest('ses_1', 'msg_1'), { method: 'GET', path: '/session/ses_1/message/msg_1', body: undefined });
  assert.equal(buildHttpPromptAsyncRequest('ses_1', { model: identity, agent: 'default', format: { type: 'text' }, parts }).path, '/session/ses_1/prompt_async');
});

test('fingerprints schema without retaining it and preserves version provenance', () => {
  const schema = { type: 'object', properties: { ok: { type: 'boolean' } } };
  assert.equal(typeof fingerprintAndDisposeSchema(schema).sha256, 'string');
  const snapshot = createVersionSnapshot({ cli: '1.18.4', sdk: '1.18.4', serverCommand: 'opencode serve', plugin: { version: '1.18.4', resolved: 'url', integrity: 'hash' } });
  assert.equal(Object.isFrozen(snapshot.plugin), true);
});

test('classifies recovery fail-closed with one root cause', () => {
  assert.equal(classifyRootCause({ dispatch: 'accepted', persistence: 'complete', sdkList: 'ok', sdkExact: 'ok' }), 'PASS');
  assert.equal(classifyRootCause({ dispatch: 'accepted', sdkList: 'Expected OutputFormatJsonSchema', httpList: 'Expected OutputFormatJsonSchema' }), 'SHARED_DECODER_FAILURE');
  assert.equal(classifyRecoveryObservation({ dispatch: 'accepted', interrupted: true, sdkList: 'ok', sdkExact: 'ok' }), 'INTERRUPTION_RECOVERED');
  assert.equal(ROOT_CAUSE_CLASSES.includes(classifyRecoveryObservation({ providerFailure: true })), true);
});

test('validates persisted assistant identity and rejects substitution', () => {
  const recovered = extractAssistantMessage({ info: { id: 'msg_1', role: 'assistant', agent: 'default', model: identity, structured: { ok: true } }, parts }, identity, 'default');
  assert.equal(recovered.messageID, 'msg_1'); assert.equal(recovered.structured, true);
  assert.throws(() => extractAssistantMessage({ info: { id: 'msg_1', role: 'assistant', model: { providerID: 'other', modelID: 'model-y' } }, parts: [] }, identity), /substituted/);
});

test('preserves redaction, isolation, transport identity, and malformed-schema refusal', () => {
  assert.equal(redactDiagnostic('token=secret password=hunter2'), 'token=[REDACTED] password=[REDACTED]');
  assert.doesNotThrow(() => assertProbeIsolation('/tmp/probe', '/workspace/CRM-Master'));
  assert.throws(() => assertProbeIsolation('/workspace/CRM-Master/tmp', '/workspace/CRM-Master'), /inside repository/);
  assert.deepEqual(createRecoveryTransport({ kind: 'http', sessionID: 'ses_1', messageID: 'msg_1' }), { kind: 'http', sessionID: 'ses_1', messageID: 'msg_1' });
  assert.equal(runMalformedSchemaControl().result, 'MALFORMED_SCHEMA_REJECTED');
});

test('does not upgrade incomplete evidence to PASS and requires identity for reports', () => {
  assert.equal(aggregateProbeObservations([{ result: 'PASS', expectedResult: 'PASS' }, { result: 'EXACT_RETRIEVAL_FAILURE', expectedResult: 'PASS' }]), 'EXACT_RETRIEVAL_FAILURE');
  assert.throws(() => createProbeReport({ runID: 'run_1', sessionID: 'ses_1', result: 'PASS', requested: identity }), /complete aggregated/);
  const report = createProbeReport({ runID: 'run_2', sessionID: 'ses_2', result: 'DISPATCH_FAILURE', requested: { ...identity, format: 'text' }, diagnostics: 'token=secret' });
  assert.equal(report.diagnostics, 'token=[REDACTED]');
});
