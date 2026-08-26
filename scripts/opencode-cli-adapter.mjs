#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn as nodeSpawn } from 'node:child_process';
import { validateOutcomePacket } from './sdd-runtime.mjs';

export const FAILURE_CLASSES = Object.freeze([
  'CLI_SPAWN_FAILURE', 'CLI_NONZERO_EXIT', 'CLI_JSON_EVENT_ERROR', 'SESSION_ID_UNAVAILABLE',
  'SESSION_EXPORT_FAILURE', 'RUNTIME_IDENTITY_MISMATCH', 'EMPTY_RESULT', 'MALFORMED_RESULT',
  'PROVIDER_UNAVAILABLE', 'QUOTA_EXHAUSTED', 'EXECUTOR_ERROR', 'COMPLETED_SUCCESS',
  'SESSION_EXPORT_COMMAND_FAILURE', 'SESSION_EXPORT_MALFORMED_JSON', 'SESSION_EXPORT_CAPTURE_OVERFLOW', 'SESSION_EXPORT_IDENTITY_MISSING',
]);

export const DIAGNOSTIC_CAPTURE_LIMIT = 4000;
export const EXPORT_MACHINE_CAPTURE_LIMIT = 32 * 1024 * 1024;
const bounded = (value, limit = DIAGNOSTIC_CAPTURE_LIMIT) => redact(String(value ?? '')).slice(0, limit);
const redact = (value) => value.replace(/(token|password|secret|api[_-]?key)(\s*[:=]\s*)[^\s,}]+/gi, '$1$2[REDACTED]');
const required = (value, name) => { if (typeof value !== 'string' || !value) throw new TypeError(`${name} must be a non-empty string`); return value; };
const identity = (info) => ({
  agent: info?.agent,
  providerID: info?.providerID ?? info?.model?.providerID,
  modelID: info?.modelID ?? info?.model?.modelID,
});
const HIGH_AUTHORITY = Object.freeze({ agent: 'sdd-direct-verify', providerID: 'openai', modelID: 'gpt-5.6-terra' });
const CANONICAL_NEXT = Object.freeze({ 'Apply 7.5 Testing': 'Apply 7.6 Apply Summary', Verify: 'Archive' });

export function createInvocationKey(input) {
  const canonical = [input.change, input.action, input.phase, input.directory, input.agent, input.provider, input.model, input.prompt].map((v) => required(v, 'invocation input'));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function parseJsonEvents(stdout) {
  const events = []; const sessionIDs = new Set(); let text = ''; let error;
  for (const line of String(stdout ?? '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    let event;
    try { event = JSON.parse(line); } catch { throw new Error('CLI_JSON_EVENT_ERROR: invalid JSON event'); }
    const type = event?.type ?? event?.event;
    const part = event?.part ?? event?.data?.part;
    if (['step_start', 'text', 'step_finish'].includes(type) || /error/i.test(type || '')) {
      events.push({ type, sessionID: event.sessionID ?? event.data?.sessionID ?? part?.sessionID, error: bounded(event.error?.message ?? event.message ?? part?.error?.message), text: typeof (event.text ?? part?.text) === 'string' ? bounded(event.text ?? part.text) : undefined });
    }
    const sessionID = event.sessionID ?? event.data?.sessionID ?? event.properties?.sessionID ?? part?.sessionID;
    if (sessionID) sessionIDs.add(sessionID);
    if (type === 'text' && typeof (event.text ?? part?.text) === 'string') text += event.text ?? part.text;
    if (/error/i.test(type || '') || event.error) error = event;
  }
  if (sessionIDs.size > 1) throw new Error('CLI_JSON_EVENT_ERROR: session IDs are not consistent');
  return { events, sessionID: [...sessionIDs][0], text: bounded(text), error, summary: { total: events.length, step_start: events.filter((x) => x.type === 'step_start').length, text_events: events.filter((x) => x.type === 'text').length, step_finish: events.filter((x) => x.type === 'step_finish').length, error_events: events.filter((x) => /error/i.test(x.type || '')).length } };
}

export function parseExport(stdout) {
  let payload;
  try { payload = JSON.parse(stdout); } catch { throw new Error('SESSION_EXPORT_MALFORMED_JSON: export was not JSON'); }
  if (!payload || !payload.info || !Array.isArray(payload.messages)) throw new Error('SESSION_EXPORT_MALFORMED_JSON: export must contain info and messages');
  const messages = payload.messages.map((message) => ({ info: message.info ?? message, parts: Array.isArray(message.parts) ? message.parts : [] }));
  const assistant = [...messages].reverse().find((message) => message.info?.role === 'assistant');
  const user = messages.find((message) => message.info?.role === 'user');
  const text = assistant?.parts.filter((part) => part.type === 'text').map((part) => part.text || '').join('') || '';
  const runtime = identity(assistant?.info);
  if (!runtime.agent || !runtime.providerID || !runtime.modelID) throw new Error('SESSION_EXPORT_IDENTITY_MISSING: persisted identity is incomplete');
  const start = assistant?.info?.time?.created; const end = assistant?.info?.time?.completed;
  const tokens = assistant?.info?.tokens || {}; const cache = tokens.cache || {};
  return { info: payload.info, userMessage: user, assistantMessage: assistant, terminalText: text, runtime, metrics: { duration_ms: Number.isFinite(end - start) ? end - start : undefined, tokens: { input: tokens.input ?? 0, output: tokens.output ?? 0, reasoning: tokens.reasoning ?? 0, total: tokens.total ?? ((tokens.input ?? 0) + (tokens.output ?? 0)), cacheRead: tokens.cacheRead ?? cache.read ?? 0, cacheWrite: tokens.cacheWrite ?? cache.write ?? 0 }, cost: typeof assistant?.info?.cost === 'number' ? assistant.info.cost : 0, finish: assistant?.info?.finish ?? assistant?.info?.finishReason, completed: Boolean(end) } };
}

export function validateSemanticPacket(text, request) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('EMPTY_RESULT');
  if (/```/.test(text)) throw new Error('MALFORMED_RESULT');
  let packet;
  try { packet = JSON.parse(text); } catch { throw new Error('MALFORMED_RESULT'); }
  if (!packet || typeof packet !== 'object' || Array.isArray(packet) || packet.change !== request.change || packet.action !== request.action || packet.role !== request.requiredRole || !Object.hasOwn(packet, 'next') || (packet.status === 'PASS' && CANONICAL_NEXT[request.action] !== packet.next)) throw new Error('MALFORMED_RESULT');
  try { return validateOutcomePacket(packet); } catch { throw new Error('MALFORMED_RESULT'); }
}

function classifyStderr(stderr) {
  const value = String(stderr).toLowerCase();
  if (/quota|rate limit|resource exhausted/.test(value)) return 'QUOTA_EXHAUSTED';
  if (/provider|model unavailable|auth|api key/.test(value)) return 'PROVIDER_UNAVAILABLE';
  return undefined;
}

function identityMatchesAuthority(request, persisted) {
  if (request.requiredRole !== 'HIGH') return true;
  const expected = request.authorityIdentity || HIGH_AUTHORITY;
  return [request.agent, request.provider, request.model].join('/') === [expected.agent, expected.providerID, expected.modelID].join('/')
    && [persisted.agent, persisted.providerID, persisted.modelID].join('/') === [expected.agent, expected.providerID, expected.modelID].join('/');
}

export function createBoundedLineCapture(limit = 16000) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('capture limit must be a positive safe integer');
  let pending = ''; let value = ''; let truncated = false;
  const append = (chunk) => {
    pending += String(chunk);
    let newline;
    while ((newline = pending.indexOf('\n')) >= 0) {
      const line = pending.slice(0, newline + 1); pending = pending.slice(newline + 1);
      if (value.length + line.length <= limit) value += line;
      else truncated = true;
    }
  };
  const finish = () => {
    if (pending) {
      if (value.length + pending.length <= limit) value += pending;
      else truncated = true;
      pending = '';
    }
    return { value, truncated };
  };
  return { append, finish };
}

export function createMachineCapture(limit = EXPORT_MACHINE_CAPTURE_LIMIT) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('machine capture limit must be a positive safe integer');
  let value = ''; let diagnosticValue = ''; let size = 0; let overflow = false;
  const append = (chunk) => {
    const text = String(chunk); size += text.length; diagnosticValue = `${diagnosticValue}${text}`.slice(0, DIAGNOSTIC_CAPTURE_LIMIT);
    if (!overflow) {
      if (value.length + text.length <= limit) value += text;
      else { overflow = true; value = ''; }
    }
  };
  const finish = () => ({ value: overflow ? '' : value, size, overflow, diagnostic: bounded(diagnosticValue) });
  return { append, finish };
}

function captureChild(child, { machine = false } = {}) {
  const stdoutCapture = machine ? createMachineCapture() : createBoundedLineCapture();
  const stderrCapture = machine ? createMachineCapture() : createBoundedLineCapture();
  const started = Date.now();
  child.stdout?.on('data', (chunk) => stdoutCapture.append(chunk)); child.stderr?.on('data', (chunk) => stderrCapture.append(chunk));
  return new Promise((resolve) => {
    let settled = false;
    const finish = (code, spawnError) => { if (settled) return; settled = true; const ended = Date.now(); const stdout = stdoutCapture.finish(); const stderr = stderrCapture.finish(); resolve({ pid: child.pid, startedAt: new Date(started).toISOString(), endedAt: new Date(ended).toISOString(), duration_ms: ended - started, stdout: machine ? stdout.value : stdout.value, stderr: machine ? stderr.value : stderr.value, stdoutDiagnostic: stdout.diagnostic, stderrDiagnostic: stderr.diagnostic, stdoutSize: machine ? stdout.size : stdout.value.length, stderrSize: machine ? stderr.size : stderr.value.length, stdoutTruncated: machine ? false : stdout.truncated, stderrTruncated: machine ? false : stderr.truncated, stdoutOverflow: machine ? stdout.overflow : false, stderrOverflow: machine ? stderr.overflow : false, exitCode: code, spawnError }); };
    child.once?.('error', (error) => finish(null, error)); child.once?.('close', (code) => finish(code)); child.on?.('error', (error) => finish(null, error)); child.on?.('close', (code) => finish(code));
  });
}

async function defaultExportCommand(sessionID, directory, spawn = nodeSpawn) {
  let child;
  try { child = spawn('opencode', ['export', sessionID], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { throw Object.assign(new Error(`SESSION_EXPORT_COMMAND_FAILURE: ${bounded(error.message)}`), { code: 'SESSION_EXPORT_COMMAND_FAILURE' }); }
  const captured = await captureChild(child, { machine: true });
  if (captured.spawnError || captured.exitCode !== 0) throw Object.assign(new Error(`SESSION_EXPORT_COMMAND_FAILURE: ${bounded(captured.stderrDiagnostic || captured.spawnError?.message)}`), { code: 'SESSION_EXPORT_COMMAND_FAILURE', exitCode: captured.exitCode, stdoutSize: captured.stdoutSize, stderrSize: captured.stderrSize });
  if (captured.stdoutOverflow || captured.stderrOverflow) throw Object.assign(new Error('SESSION_EXPORT_CAPTURE_OVERFLOW: machine export capture exceeded its explicit ceiling'), { code: 'SESSION_EXPORT_CAPTURE_OVERFLOW' });
  return captured;
}

function normalizeExportCapture(result) {
  if (typeof result === 'string') return { stdout: result, stdoutSize: result.length, stderr: '', stderrSize: 0, stdoutOverflow: false, stderrOverflow: false, exitCode: undefined };
  if (result?.commandFailure || result?.spawnError || (result?.exitCode !== undefined && result.exitCode !== 0)) throw Object.assign(new Error('SESSION_EXPORT_COMMAND_FAILURE: export command failed'), { code: 'SESSION_EXPORT_COMMAND_FAILURE' });
  if (!result || typeof result.stdout !== 'string') throw Object.assign(new Error('SESSION_EXPORT_MALFORMED_JSON: export capture has no stdout'), { code: 'SESSION_EXPORT_MALFORMED_JSON' });
  if (result.overflow || result.stdoutOverflow || result.stderrOverflow) throw Object.assign(new Error('SESSION_EXPORT_CAPTURE_OVERFLOW: machine export capture exceeded its explicit ceiling'), { code: 'SESSION_EXPORT_CAPTURE_OVERFLOW' });
  return { ...result, stdoutSize: result.stdoutSize ?? result.stdout.length, stderrSize: result.stderrSize ?? String(result.stderr ?? '').length };
}

const exportEvidence = (capture) => ({ export_size: capture.stdoutSize, export_sha256: createHash('sha256').update(capture.stdout).digest('hex'), export_exit_code: capture.exitCode });

export function createCliAdapter({ spawn = nodeSpawn, exportCommand } = {}) {
  const active = new Map(); const completed = new Set();
  const exportRunner = exportCommand || ((sessionID, directory) => defaultExportCommand(sessionID, directory, spawn));
  const execute = (request) => {
    const key = createInvocationKey(request);
    if (completed.has(key)) throw new Error('completed result already consumed');
    if (active.has(key)) return active.get(key);
    const promise = runInvocation(request, key, spawn, exportRunner);
    const shared = promise.then((result) => { if (result.status === 'COMPLETED_SUCCESS') completed.add(key); active.delete(key); return result; }, (error) => { active.delete(key); throw error; });
    active.set(key, shared);
    return shared;
  };
  return { execute, invocationKey: createInvocationKey };
}

async function runInvocation(request, invocationKey, spawn, exportRunner) {
  const evidence = { invocation_key: invocationKey, phase: request.phase, required_capability: request.capability, requested: { agent: request.agent, provider: request.provider, model: request.model }, started_at: null, ended_at: null, pid: null, stdout: '', stderr: '', stderr_classification: undefined, json_event_summary: undefined, sessionID: undefined, exit_code: undefined, export_status: 'NOT_ATTEMPTED' };
  let captured;
  try { captured = await captureChild(spawn('opencode', ['run', '--dir', request.directory, '--agent', request.agent, '--model', `${request.provider}/${request.model}`, '--format', 'json', request.prompt], { cwd: request.directory, stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (error) { return { status: 'CLI_SPAWN_FAILURE', invocationKey, evidence: { ...evidence, stderr: bounded(error.message) } }; }
  Object.assign(evidence, { pid: captured.pid, started_at: captured.startedAt, ended_at: captured.endedAt, duration_ms: captured.duration_ms, stdout: captured.stdout, stderr: captured.stderr, stdout_truncated: captured.stdoutTruncated, stderr_truncated: captured.stderrTruncated, capture_truncated: captured.stdoutTruncated || captured.stderrTruncated, exit_code: captured.exitCode, stderr_classification: classifyStderr(captured.stderr) });
  if (captured.spawnError) return { status: 'CLI_SPAWN_FAILURE', invocationKey, evidence: { ...evidence, error: bounded(captured.spawnError.message) } };
  let events; try { events = parseJsonEvents(captured.stdout); evidence.json_event_summary = events.summary; evidence.sessionID = events.sessionID; } catch (error) { return { status: 'CLI_JSON_EVENT_ERROR', invocationKey, evidence: { ...evidence, error: bounded(error.message) } }; }
  if (events.error) return { status: 'CLI_JSON_EVENT_ERROR', invocationKey, evidence };
  if (evidence.stderr_classification) return { status: evidence.stderr_classification, invocationKey, evidence };
  if (captured.exitCode !== 0) return { status: evidence.stderr_classification || 'CLI_NONZERO_EXIT', invocationKey, evidence };
  if (!events.sessionID) return { status: 'SESSION_ID_UNAVAILABLE', invocationKey, evidence };
  let exported; let exportCapture; let rawExportCapture;
  try { rawExportCapture = await exportRunner(events.sessionID, request.directory); exportCapture = normalizeExportCapture(rawExportCapture); evidence.export_status = 'CAPTURED'; Object.assign(evidence, exportEvidence(exportCapture)); exported = parseExport(exportCapture.stdout); evidence.export_status = 'COMPLETED'; }
  catch (error) {
    const status = error.code || (/SESSION_EXPORT_IDENTITY_MISSING/.test(error.message) ? 'SESSION_EXPORT_IDENTITY_MISSING' : /RUNTIME_IDENTITY_MISMATCH/.test(error.message) ? 'RUNTIME_IDENTITY_MISMATCH' : /SESSION_EXPORT_MALFORMED_JSON/.test(error.message) ? 'SESSION_EXPORT_MALFORMED_JSON' : 'SESSION_EXPORT_COMMAND_FAILURE');
    return { status, invocationKey, evidence: { ...evidence, export_exit_code: rawExportCapture?.exitCode ?? error.exitCode, ...(rawExportCapture && typeof rawExportCapture === 'object' ? { export_size: rawExportCapture.stdoutSize ?? (typeof rawExportCapture.stdout === 'string' ? rawExportCapture.stdout.length : undefined) } : {}), export_error: bounded(error.message) } };
  }
  const requestedIdentity = { agent: request.agent, providerID: request.provider, modelID: request.model };
  if (JSON.stringify(exported.runtime) !== JSON.stringify(requestedIdentity) || !identityMatchesAuthority(request, exported.runtime)) return { status: 'RUNTIME_IDENTITY_MISMATCH', invocationKey, evidence: { ...evidence, persisted_runtime: exported.runtime } };
  let packet; try { packet = validateSemanticPacket(exported.terminalText, request); } catch (error) { return { status: error.message === 'EMPTY_RESULT' ? 'EMPTY_RESULT' : 'MALFORMED_RESULT', invocationKey, evidence: { ...evidence, persisted_runtime: exported.runtime, terminal_text: bounded(exported.terminalText) } }; }
  return { status: 'COMPLETED_SUCCESS', invocationKey, packet, evidence: { ...evidence, persisted_runtime: exported.runtime, terminal: { text: bounded(exported.terminalText), finish: true }, metrics: exported.metrics } };
}

export async function recoverInterruptedInvocation(metadata, { exportCommand } = {}) {
  if (!metadata?.sessionID) return { status: 'SESSION_ID_UNAVAILABLE', invocationKey: metadata?.invocationKey };
  let rawExportCapture;
  try {
    if (typeof exportCommand !== 'function') throw new Error('SESSION_EXPORT_FAILURE: export function is required');
    rawExportCapture = await exportCommand(metadata.sessionID, metadata.directory);
    const capture = normalizeExportCapture(rawExportCapture);
    const exported = parseExport(capture.stdout);
    const request = { ...metadata, requiredRole: metadata.requiredRole || metadata.role, provider: metadata.provider || metadata.providerID, model: metadata.model || metadata.modelID };
    if (JSON.stringify(exported.runtime) !== JSON.stringify({ agent: request.agent, providerID: request.provider, modelID: request.model }) || !identityMatchesAuthority(request, exported.runtime)) return { status: 'RUNTIME_IDENTITY_MISMATCH', invocationKey: metadata.invocationKey };
    const packet = validateSemanticPacket(exported.terminalText, request);
    return { status: 'COMPLETED_SUCCESS', invocationKey: metadata.invocationKey, packet, evidence: { ...exportEvidence(capture), export_status: 'COMPLETED', persisted_runtime: exported.runtime, metrics: exported.metrics } };
  } catch (error) { const status = error.code || (/EXECUTOR_ERROR/.test(error.message) ? 'EXECUTOR_ERROR' : /SESSION_EXPORT_IDENTITY_MISSING/.test(error.message) ? 'SESSION_EXPORT_IDENTITY_MISSING' : /SESSION_EXPORT_MALFORMED_JSON/.test(error.message) ? 'SESSION_EXPORT_MALFORMED_JSON' : /EMPTY_RESULT/.test(error.message) ? 'EMPTY_RESULT' : 'SESSION_EXPORT_COMMAND_FAILURE'); return { status, invocationKey: metadata.invocationKey, evidence: { export_exit_code: rawExportCapture?.exitCode ?? error.exitCode, ...(rawExportCapture && typeof rawExportCapture === 'object' ? { export_size: rawExportCapture.stdoutSize ?? (typeof rawExportCapture.stdout === 'string' ? rawExportCapture.stdout.length : undefined) } : {}), error: bounded(error.message) } }; }
}
