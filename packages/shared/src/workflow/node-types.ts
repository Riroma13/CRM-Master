import { z } from 'zod';

export const NodeId = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const JsonValue: z.ZodType<unknown> = z.lazy(() => z.union([
  z.string().max(1024), z.number().finite(), z.boolean(), z.null(),
  z.array(JsonValue).max(100), z.record(z.string(), JsonValue).refine((v) => Object.keys(v).length <= 100),
]));
const JsonRecord = z.record(z.string(), JsonValue).refine((v) => Object.keys(v).length <= 100);
const Literal = z.union([z.string().max(1024), z.number().finite(), z.boolean(), z.null()]);
const Operand = z.object({
  source: z.literal('variable'),
  field: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,63}$/),
}).strict();
export const PredicateSchema = z.discriminatedUnion('operator', [
  z.object({ operator: z.literal('equals'), left: Operand, right: Literal }).strict(),
  z.object({ operator: z.literal('notEquals'), left: Operand, right: Literal }).strict(),
]);
const Condition = z.object({ when: PredicateSchema, next: NodeId }).strict();
const Base = { id: NodeId, name: z.string().min(1).max(120) };
const Empty = z.object({}).strict();
const node = z.union([
  z.object({ ...Base, type: z.literal('start'), config: Empty, next: z.array(NodeId).max(10).optional() }).strict(),
  z.object({ ...Base, type: z.literal('end'), config: Empty }).strict(),
  z.object({ ...Base, type: z.literal('event-wait'), config: Empty }).strict(),
  z.object({ ...Base, type: z.literal('service-task'), config: z.object({ actionId: NodeId }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('user-task'), config: z.object({ assignee: z.string().max(128).optional(), input: JsonRecord.optional() }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('decision'), config: z.object({ conditions: z.array(Condition).min(1).max(20), defaultNext: NodeId.optional() }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('parallel-split'), config: z.object({ next: z.array(NodeId).min(1).max(10) }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('parallel-join'), config: z.object({ branchGroup: NodeId, next: z.array(NodeId).max(10).optional() }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('timer'), config: z.object({ delayMs: z.number().int().min(1).max(86_400_000) }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('sub-workflow'), config: z.object({ definitionId: NodeId }).strict() }).strict(),
  z.object({ ...Base, type: z.literal('compensation'), config: z.object({ next: z.array(NodeId).min(1).max(10) }).strict() }).strict(),
]);

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(node).min(1).max(100),
  startNode: NodeId,
}).strict();

export type NodeType = z.infer<typeof node>['type'];
export type WorkflowNode = z.infer<typeof node>;
export type Predicate = z.infer<typeof PredicateSchema>;
export type WorkflowDefinitionInput = z.infer<typeof WorkflowDefinitionSchema>;

export function parseWorkflowDefinition(input: unknown): WorkflowDefinitionInput {
  const parsed = WorkflowDefinitionSchema.parse(input);
  const ids = new Set(parsed.nodes.map((item) => item.id));
  if (ids.size !== parsed.nodes.length) throw new z.ZodError([{ code: 'custom', path: ['nodes'], message: 'Duplicate node id' }]);
  const references: string[] = [];
  for (const item of parsed.nodes) {
    const config = item.config as Record<string, unknown>;
    if (Array.isArray(config.next)) references.push(...config.next as string[]);
    if (typeof config.defaultNext === 'string') references.push(config.defaultNext);
    if (Array.isArray(config.conditions)) references.push(...(config.conditions as Array<{ next: string }>).map((c) => c.next));
  }
  if (!ids.has(parsed.startNode) || references.some((reference) => !ids.has(reference))) {
    throw new z.ZodError([{ code: 'custom', path: ['nodes'], message: 'Dangling node reference' }]);
  }
  return parsed;
}
