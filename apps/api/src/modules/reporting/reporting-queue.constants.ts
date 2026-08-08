export const REPORTING_QUEUE_NAMES = {
  DATASET_INGESTION: 'reporting-dataset-ingestion',
  DATASET_DLQ: 'reporting-dataset-dlq',
  REPORT_GENERATE: 'reporting-report-generate',
  EXPORT: 'reporting-export',
  SCHEDULE: 'reporting-schedule',
} as const;

export const REPORTING_QUEUE_IDENTITIES = Object.values(REPORTING_QUEUE_NAMES);
