#!/usr/bin/env node

import { createHash } from 'node:crypto';

export const ROOT_CAUSE_CLASSES = Object.freeze([
  'PASS', 'DISPATCH_FAILURE', 'PROVIDER_OR_MODEL_FAILURE', 'PERSISTENCE_FAILURE',
  'LIST_RETRIEVAL_FAILURE', 'EXACT_RETRIEVAL_FAILURE', 'SHARED_DECODER_FAILURE',
  'STRUCTURED_OUTPUT_ERROR', 'INTERRUPTION_RECOVERED', 'MALFORMED_SCHEMA_REJECTED',
  'VERSION_MISMATCH', 'OBSERVATION_WINDOW_EXPIRED',
]);

const json = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(json).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${json(value[key])}`).join(',')}}`;
};

const requireString = (value, name) => {
  if (typeof value !== 'string' || !value) throw new TypeError(`${name} must be a non-empty string`);
  return value;
};

const requireModel = (model) => {
  if (!model || typeof model !== 'object') throw new TypeError('model is required');
  return { providerID: requireString(model.providerID, 'model.providerID'), modelID: requireString(model.modelID, 'model.modelID') };
};

export function buildSdkPromptAsyncRequest(input = {}) {
  if (Object.hasOwn(input, 'path') || Object.hasOwn(input, 'body')) throw new TypeError('typed SDK request cannot contain path or body');
  const { sessionID, messageID, model, agent, format, parts, directory } = input;
  requireString(sessionID, 'sessionID');
  if (directory !== undefined) requireString(directory, 'directory');
  if (messageID !== undefined) requireString(messageID, 'messageID');
  const requestedModel = requireModel(model);
  if (agent !== undefined) requireString(agent, 'agent');
  if (!format || !['text', 'json_schema'].includes(format.type)) throw new TypeError('format type is invalid');
  if (format.type === 'json_schema' && (!format.schema || typeof format.schema !== 'object' || Array.isArray(format.schema))) throw new TypeError('json schema is required');
  if (!Array.isArray(parts) || parts.length === 0 || parts.some((part) => part?.type !== 'text' || typeof part.text !== 'string')) throw new TypeError('text parts are required');
  return { sessionID, ...(directory === undefined ? {} : { directory }), ...(messageID === undefined ? {} : { messageID }), model: requestedModel, ...(agent === undefined ? {} : { agent }), format: structuredClone(format), parts: structuredClone(parts) };
}

export function buildHttpListRequest(sessionID) {
  requireString(sessionID, 'sessionID');
  return { method: 'GET', path: `/session/${encodeURIComponent(sessionID)}/message`, body: undefined };
}

export function buildHttpExactRequest(sessionID, messageID) {
  requireString(sessionID, 'sessionID');
  requireString(messageID, 'messageID');
  return { method: 'GET', path: `/session/${encodeURIComponent(sessionID)}/message/${encodeURIComponent(messageID)}`, body: undefined };
}

export function buildHttpPromptAsyncRequest(sessionID, body) {
  requireString(sessionID, 'sessionID');
  const request = buildSdkPromptAsyncRequest({ sessionID, ...body });
  const { sessionID: ignored, directory: ignoredDirectory, ...httpBody } = request;
  return { method: 'POST', path: `/session/${encodeURIComponent(sessionID)}/prompt_async`, body: httpBody };
}

export function fingerprintAndDisposeSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new TypeError('schema must be an object');
  return { sha256: createHash('sha256').update(json(schema)).digest('hex') };
}

export function createVersionSnapshot({ cli, sdk, serverCommand, plugin } = {}) {
  const snapshot = { cli: requireString(cli, 'cli'), sdk: requireString(sdk, 'sdk'), serverCommand: requireString(serverCommand, 'serverCommand'), plugin: {
    version: requireString(plugin?.version, 'plugin.version'), resolved: requireString(plugin?.resolved, 'plugin.resolved'), integrity: requireString(plugin?.integrity, 'plugin.integrity'),
  } };
  return deepFreeze(snapshot);
}

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};

export function classifyRootCause(observation = {}) {
  if (observation.versionMismatch) return 'VERSION_MISMATCH';
  if (observation.dispatch === 'malformed-schema') return 'MALFORMED_SCHEMA_REJECTED';
  if (observation.dispatch === 'error') return observation.errorName === 'ProviderAuthError' ? 'PROVIDER_OR_MODEL_FAILURE' : 'DISPATCH_FAILURE';
  if (observation.errorName === 'MessageAbortedError') return 'INTERRUPTION_RECOVERED';
  if (observation.errorName === 'StructuredOutputError') return 'STRUCTURED_OUTPUT_ERROR';
  if (observation.sdkList?.includes('Expected OutputFormatJsonSchema') && observation.httpList?.includes('Expected OutputFormatJsonSchema')) return 'SHARED_DECODER_FAILURE';
  if (observation.persistence === 'failed') return 'PERSISTENCE_FAILURE';
  if (observation.sdkList === 'error') return 'LIST_RETRIEVAL_FAILURE';
  if (observation.sdkExact === 'error') return 'EXACT_RETRIEVAL_FAILURE';
  if (observation.dispatch === 'accepted' && observation.persistence === 'complete' && observation.sdkList === 'ok' && observation.sdkExact === 'ok') return 'PASS';
  return 'DISPATCH_FAILURE';
}

export function classifyRecoveryObservation(observation = {}) {
  if (observation.versionMismatch) return 'VERSION_MISMATCH';
  if (observation.dispatch === 'malformed-schema') return 'MALFORMED_SCHEMA_REJECTED';
  if (observation.errorName === 'MessageAbortedError' || observation.interrupted) return 'INTERRUPTION_RECOVERED';
  if (observation.sdkDecoderError && observation.httpDecoderError) return 'SHARED_DECODER_FAILURE';
  if (observation.decoderError) return observation.decoderBoundary === 'sdk' ? 'LIST_RETRIEVAL_FAILURE' : 'EXACT_RETRIEVAL_FAILURE';
  if (observation.errorName === 'StructuredOutputError') return 'STRUCTURED_OUTPUT_ERROR';
  if (['ProviderAuthError', 'ContentFilterError', 'ContextOverflowError'].includes(observation.errorName) || observation.providerFailure || observation.modelFailure) return 'PROVIDER_OR_MODEL_FAILURE';
  if (observation.dispatch === 'error') return observation.errorName === 'ProviderAuthError' ? 'PROVIDER_OR_MODEL_FAILURE' : 'DISPATCH_FAILURE';
  if (observation.identityError || observation.missingIdentity) return 'EXACT_RETRIEVAL_FAILURE';
  if (observation.persistence === 'failed') return 'PERSISTENCE_FAILURE';
  if (observation.sdkList === 'error') return 'LIST_RETRIEVAL_FAILURE';
  if (observation.sdkExact === 'error') return 'EXACT_RETRIEVAL_FAILURE';
  if (observation.dispatch === 'accepted' && observation.persistence === 'complete' && observation.sdkList === 'ok' && observation.sdkExact === 'ok' && (observation.httpList === 200 || observation.httpList === undefined) && (observation.httpExact === 200 || observation.httpExact === undefined)) return 'PASS';
  return 'DISPATCH_FAILURE';
}

export function createRecoveryTransport({ kind, sessionID, messageID } = {}) {
  requireString(sessionID, 'sessionID'); requireString(messageID, 'messageID');
  if (!['sdk', 'http'].includes(kind)) throw new TypeError('recovery transport kind is invalid');
  return { kind, sessionID, messageID };
}

const boundedParts = (parts) => (Array.isArray(parts) ? parts.slice(0, 32).map((part) => ({ ...(part?.id ? { id: part.id } : {}), ...(part?.type ? { type: part.type } : {}), ...(typeof part?.text === 'string' ? { text: part.text.slice(0, 2000) } : {}) })) : []);

export function extractAssistantMessage(payload, requestedModel, requestedAgent) {
  const message = (payload?.data ?? payload)?.info;
  if (!message || message.role !== 'assistant' || typeof message.id !== 'string') throw new TypeError('assistant Message identity is missing');
  const model = requireModel(message.model || { providerID: message.providerID, modelID: message.modelID });
  const requested = requireModel(requestedModel);
  if (model.providerID !== requested.providerID || model.modelID !== requested.modelID) throw new TypeError('requested model identity was substituted');
  if (requestedAgent !== undefined && message.agent !== requestedAgent) throw new TypeError('requested agent identity was substituted');
  return { messageID: message.id, ...(message.agent ? { agent: message.agent } : {}), model, ...(message.structured !== undefined ? { structured: true } : {}), ...(message.error?.name === 'StructuredOutputError' ? { structuredOutputError: true } : {}), parts: boundedParts((payload?.data ?? payload)?.parts) };
}

export function redactDiagnostic(value) { return String(value).replace(/(token|password|secret|api[_-]?key)=([^\s]+)/gi, '$1=[REDACTED]'); }

export function assertProbeIsolation(workspace, repositoryRoot) {
  requireString(workspace, 'workspace'); requireString(repositoryRoot, 'repositoryRoot');
  const workspacePath = workspace.replace(/\\/g, '/').replace(/\/+$/, '');
  const rootPath = repositoryRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  if (workspacePath === rootPath || workspacePath.startsWith(`${rootPath}/`)) throw new TypeError('probe workspace may not be inside repository root');
  return true;
}

export function aggregateProbeObservations(scenarios) {
  const failures = scenarios.flatMap(({ result, expectedResult }) => result && result !== expectedResult && !(expectedResult === 'PASS' && result === 'INTERRUPTION_RECOVERED') ? [result] : []);
  return ['VERSION_MISMATCH', 'MALFORMED_SCHEMA_REJECTED', 'DISPATCH_FAILURE', 'PROVIDER_OR_MODEL_FAILURE', 'PERSISTENCE_FAILURE', 'SHARED_DECODER_FAILURE', 'LIST_RETRIEVAL_FAILURE', 'EXACT_RETRIEVAL_FAILURE', 'STRUCTURED_OUTPUT_ERROR', 'OBSERVATION_WINDOW_EXPIRED', 'INTERRUPTION_RECOVERED', 'PASS'].find((item) => failures.includes(item)) || 'PASS';
}

export function createProbeReport({ runID, versions, requested, sessionID, assistantMessageID, recovery = {}, result, diagnostics } = {}) {
  requireString(runID, 'runID'); requireString(sessionID, 'sessionID');
  if (!ROOT_CAUSE_CLASSES.includes(result)) throw new TypeError('invalid root cause class');
  if (!requested?.providerID || !requested?.modelID) throw new TypeError('requested identity is required');
  if (result === 'PASS' && (!Array.isArray(recovery.scenarios) || aggregateProbeObservations(recovery.scenarios) !== 'PASS')) throw new TypeError('PASS requires complete aggregated scenario evidence');
  return { runID, versions, requested: { ...requested, sdkDispatch: 'flattened' }, sessionID, ...(assistantMessageID ? { assistantMessageID } : {}), recovery, result, ...(diagnostics ? { diagnostics: redactDiagnostic(diagnostics) } : {}) };
}

export function runMalformedSchemaControl() {
  try { buildSdkPromptAsyncRequest({ sessionID: 'malformed-control', model: { providerID: 'control', modelID: 'control' }, agent: 'default', format: { type: 'json_schema', schema: [] }, parts: [{ type: 'text', text: 'control' }] }); }
  catch (error) { return { scenario: 'malformed-schema', dispatch: 'malformed-schema', result: 'MALFORMED_SCHEMA_REJECTED', expectedResult: 'MALFORMED_SCHEMA_REJECTED', retry: false, substitution: false, error: { name: error.name, message: error.message } }; }
  return { scenario: 'malformed-schema', dispatch: 'accepted', result: 'DISPATCH_FAILURE', expectedResult: 'MALFORMED_SCHEMA_REJECTED', retry: false, substitution: false };
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify({ status: 'RETIRED', message: 'Semantic recovery uses scripts/opencode-cli-adapter.mjs only.' }));
