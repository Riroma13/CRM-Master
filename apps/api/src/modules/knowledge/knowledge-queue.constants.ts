export const KNOWLEDGE_QUEUE_NAMES = {
  INGESTION: 'kb-ingestion',
  REINDEX: 'kb-reindex',
  GARBAGE_COLLECTOR: 'kb-garbage-collector',
  DLQ: 'kb-ingestion-dlq',
} as const;

export const KNOWLEDGE_QUEUE_IDENTITIES = Object.values(KNOWLEDGE_QUEUE_NAMES);
