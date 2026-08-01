import { createReportingReadOnlyMiddleware } from '../reporting-read-only.middleware';
import { PrismaService } from '../../../common/prisma.service';

type MWParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

describe('ReportingReadOnlyMiddleware', () => {
  let middleware: ReturnType<typeof createReportingReadOnlyMiddleware>;

  beforeEach(() => {
    middleware = createReportingReadOnlyMiddleware();
  });

  function createParams(overrides: Partial<MWParams>): MWParams {
    return {
      model: 'AnalyticsDataset',
      action: 'findMany',
      args: {},
      dataPath: [],
      runInTransaction: false,
      ...overrides,
    };
  }

  describe('reporting models are allowed', () => {
    const reportingModels = [
      'AnalyticsDataset',
      'AnalyticsSnapshot',
      'Kpi',
      'Dashboard',
      'DashboardWidget',
      'ReportDefinition',
      'ReportExecution',
      'ExportJob',
      'DatasetIngestionLog',
    ];

    reportingModels.forEach(model => {
      it(`allows ${model} queries`, async () => {
        const next = jest.fn().mockResolvedValue([]);
        const params = createParams({ model, action: 'findMany' });

        const result = await middleware(params, next);

        expect(next).toHaveBeenCalledWith(params);
        expect(result).toEqual([]);
      });

      it(`allows create on ${model}`, async () => {
        const next = jest.fn().mockResolvedValue({ id: 'new-1' });
        const params = createParams({ model, action: 'create', args: { data: {} } });

        const result = await middleware(params, next);

        expect(next).toHaveBeenCalledWith(params);
        expect(result).toEqual({ id: 'new-1' });
      });

      it(`allows update on ${model}`, async () => {
        const next = jest.fn().mockResolvedValue({ id: 'upd-1' });
        const params = createParams({ model, action: 'update', args: { where: { id: 'upd-1' }, data: {} } });

        const result = await middleware(params, next);

        expect(next).toHaveBeenCalledWith(params);
        expect(result).toEqual({ id: 'upd-1' });
      });

      it(`allows delete on ${model}`, async () => {
        const next = jest.fn().mockResolvedValue({ id: 'del-1' });
        const params = createParams({ model, action: 'delete', args: { where: { id: 'del-1' } } });

        const result = await middleware(params, next);

        expect(next).toHaveBeenCalledWith(params);
        expect(result).toEqual({ id: 'del-1' });
      });
    });
  });

  describe('non-reporting models are blocked', () => {
    const nonReportingModels = [
      'User',
      'Tenant',
      'Cliente',
      'Sistema',
      'AuditEvent',
      'NotificationInstance',
      'WorkflowInstance',
      'ActivityEvent',
      'Documento',
      'IntegrationExecution',
    ];

    nonReportingModels.forEach(model => {
      it(`blocks queries to ${model}`, async () => {
        const next = jest.fn();
        const params = createParams({ model, action: 'findMany' });

        await expect(middleware(params, next)).rejects.toThrow(
          'Reporting module is read-only. Queries are restricted to reporting models only.',
        );
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('all operations on non-reporting models are blocked', () => {
    it('blocks findMany on non-reporting model', async () => {
      const next = jest.fn();
      const params = createParams({ model: 'User', action: 'findMany' });

      await expect(middleware(params, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks findFirst on non-reporting model', async () => {
      const next = jest.fn();
      const params = createParams({ model: 'Tenant', action: 'findFirst' });

      await expect(middleware(params, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks create on non-reporting model', async () => {
      const next = jest.fn();
      const params = createParams({ model: 'Cliente', action: 'create' });

      await expect(middleware(params, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks update on non-reporting model', async () => {
      const next = jest.fn();
      const params = createParams({ model: 'Sistema', action: 'update' });

      await expect(middleware(params, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks delete on non-reporting model', async () => {
      const next = jest.fn();
      const params = createParams({ model: 'Documento', action: 'delete' });

      await expect(middleware(params, next)).rejects.toThrow();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('passes through when no model is specified', () => {
    it('allows operations without model', async () => {
      const next = jest.fn().mockResolvedValue(true);
      const params = createParams({ model: undefined, action: '$connect' });

      const result = await middleware(params, next);

      expect(next).toHaveBeenCalledWith(params);
      expect(result).toBe(true);
    });

    it('allows raw queries without model', async () => {
      const next = jest.fn().mockResolvedValue([{ count: 42 }]);
      const params = createParams({ model: undefined, action: '$queryRaw' });

      const result = await middleware(params, next);

      expect(next).toHaveBeenCalledWith(params);
      expect(result).toEqual([{ count: 42 }]);
    });
  });
});

describe('Reporting Prisma client access path', () => {
  it('exposes a dedicated reporting client', () => {
    const prisma = new PrismaService();

    expect(typeof (prisma as any).forReporting).toBe('function');
  });

  it('blocks non-reporting models through the dedicated client', async () => {
    const prisma = new PrismaService();
    const client = (prisma as any).forReporting('tenant-1');

    await expect(client.user.findMany()).rejects.toThrow(
      'Reporting module is read-only. Queries are restricted to reporting models only.',
    );
  });

  it('does not apply reporting restrictions to the ordinary admin client', async () => {
    const prisma = new PrismaService();
    let error: unknown;

    try {
      await prisma.admin.legacyUser.findMany();
    } catch (caught) {
      error = caught;
    }

    expect(error instanceof Error ? error.message : '').not.toContain(
      'Reporting module is read-only',
    );
  });

  it('does not apply reporting restrictions to the ordinary tenant client', async () => {
    const prisma = new PrismaService();
    let error: unknown;

    try {
      await prisma.forTenant('tenant-1').user.findMany();
    } catch (caught) {
      error = caught;
    }

    expect(error instanceof Error ? error.message : '').not.toContain(
      'Reporting module is read-only',
    );
  });
});
