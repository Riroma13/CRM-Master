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

export function createReportingReadOnlyExtension() {
  return {
    query: {
      $allModels: {
        async $allOperations({ model, args, query }: { model?: string; args: any; query: (args: any) => Promise<any> }) {
          if (model && !ALLOWLIST.has(model)) {
            throw new Error(
              `Reporting module is read-only. Queries are restricted to reporting models only. ` +
              `Model "${model}" is not in the allowlist.`,
            );
          }

          return query(args);
        },
      },
    },
  };
}

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
