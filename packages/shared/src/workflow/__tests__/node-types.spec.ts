import { describe, expect, it } from 'vitest';
import { parseWorkflowDefinition } from '../node-types';

const valid = {
  startNode: 'start',
  nodes: [
    { id: 'start', name: 'Start', type: 'start', config: {}, next: ['decision'] },
    { id: 'decision', name: 'Decision', type: 'decision', config: {
      conditions: [{ when: { operator: 'equals', left: { source: 'variable', field: 'status' }, right: 'ready' }, next: 'end' }],
    } },
    { id: 'end', name: 'End', type: 'end', config: {} },
  ],
};

describe('WorkflowDefinitionSchema', () => {
  it('accepts bounded literal predicates and references', () => {
    expect(parseWorkflowDefinition(valid).startNode).toBe('start');
  });

  it.each([
    { expression: 'status === "ready"' },
    { when: { operator: 'equals', left: { source: 'variable', field: 'status.nested' }, right: 'ready' } },
  ])('rejects legacy or invalid predicate input', (condition) => {
    expect(() => parseWorkflowDefinition({ ...valid, nodes: [{ ...valid.nodes[1], config: { conditions: [{ ...condition, next: 'end' }] } }, ...valid.nodes.slice(1)] })).toThrow();
  });

  it('rejects unknown keys and dangling references', () => {
    expect(() => parseWorkflowDefinition({ ...valid, extra: true })).toThrow();
    expect(() => parseWorkflowDefinition({ ...valid, startNode: 'missing' })).toThrow();
  });
});
