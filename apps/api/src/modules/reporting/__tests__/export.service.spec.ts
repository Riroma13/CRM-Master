import { ExportService } from '../export/export.service';

describe('ExportService', () => {
  let service: ExportService;
  let mockPrisma: any;
  let scopedClient: any;
  let mockQueue: any;

  beforeEach(() => {
    scopedClient = {
      exportJob: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockPrisma = { forTenant: jest.fn().mockReturnValue(scopedClient) };
    mockQueue = { add: jest.fn() };
    service = new ExportService(mockPrisma, mockQueue);
  });

  it('creates an export job and queues it', async () => {
    scopedClient.exportJob.create.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-1',
      type: 'report',
      format: 'csv',
      status: 'pending',
      createdAt: new Date(),
    });

    const result = await service.createExport('tenant-1', 'report', 'csv', {
      reportId: 'report-1',
    });

    expect(result.id).toBe('job-1');
    expect(result.status).toBe('pending');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'export',
      expect.objectContaining({
        jobId: 'job-1',
        tenantId: 'tenant-1',
        format: 'csv',
      }),
      expect.any(Object),
    );
  });

  it('returns export job status', async () => {
    scopedClient.exportJob.findUnique.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-1',
      type: 'report',
      format: 'json',
      status: 'completed',
      filePath: 'exports/tenant-1/job-1.json',
    });

    const result = await service.getExport('tenant-1', 'job-1');

    expect(result.status).toBe('completed');
    expect(result.id).toBe('job-1');
  });

  it('throws when export job is not found', async () => {
    scopedClient.exportJob.findUnique.mockResolvedValue(null);

    await expect(service.getExport('tenant-1', 'nonexistent')).rejects.toThrow(
      'not found',
    );
  });

  it('throws ForbiddenException when tenantId does not match', async () => {
    scopedClient.exportJob.findUnique.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-2',
      status: 'completed',
      format: 'csv',
    });

    await expect(
      service.downloadExport('tenant-1', 'job-1'),
    ).rejects.toThrow('Cross-tenant export access denied');
  });

  it('throws when export is not completed', async () => {
    scopedClient.exportJob.findUnique.mockResolvedValue({
      id: 'job-1',
      tenantId: 'tenant-1',
      status: 'pending',
      format: 'json',
    });

    await expect(
      service.downloadExport('tenant-1', 'job-1'),
    ).rejects.toThrow('not completed');
  });

  it('marks export as completed and stores file', async () => {
    scopedClient.exportJob.update.mockResolvedValue({
      id: 'job-1',
      status: 'completed',
      filePath: 'exports/tenant-1/job-1.json',
    });

    const buffer = Buffer.from(JSON.stringify({ data: 'test' }));
    await service.markCompleted('job-1', 'tenant-1', 'json', buffer);

    expect(scopedClient.exportJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: expect.objectContaining({
        status: 'completed',
        filePath: expect.stringContaining('exports/tenant-1/job-1.json'),
      }),
    });
  });

  it('marks export as failed', async () => {
    scopedClient.exportJob.update.mockResolvedValue({
      id: 'job-1',
      status: 'failed',
      error: 'Something went wrong',
    });

    await service.markFailed('job-1', 'tenant-1', 'Something went wrong');

    expect(scopedClient.exportJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: expect.objectContaining({
        status: 'failed',
        error: 'Something went wrong',
      }),
    });
  });
});
