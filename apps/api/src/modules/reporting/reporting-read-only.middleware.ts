const ALLOWLIST = new Set([
  'AnalyticsDataset',
  'AnalyticsSnapshot',
  'Kpi',
  'Dashboard',
  'DashboardWidget',
  'ReportDefinition',
  'ReportExecution',
  'ExportJob',
  'DatasetIngestionLog',
]);

type MiddlewareParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

type MiddlewareNext = (params: MiddlewareParams) => Promise<any>;

export function createReportingReadOnlyMiddleware(): (params: MiddlewareParams, next: MiddlewareNext) => Promise<any> {
  return async (params, next) => {
    if (params.model && !ALLOWLIST.has(params.model)) {
      throw new Error(
        `Reporting module is read-only. Queries are restricted to reporting models only. ` +
        `Model "${params.model}" is not in the allowlist.`,
      );
    }

    return next(params);
  };
}
