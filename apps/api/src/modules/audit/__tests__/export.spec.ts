import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma.service';
import { ExportService } from '../export/export.service';
import { JsonExporter } from '../export/json-exporter';
import { CsvExporter } from '../export/csv-exporter';

function makeEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'evt-1',
    tenantId: 'tenant-test',
    actorType: 'user',
    actorId: 'user-1',
    actorName: null,
    resourceType: 'document',
    resourceId: 'doc-1',
    resourceName: null,
    action: 'create',
    outcome: 'success',
    ipAddress: null,
    userAgent: null,
    correlationId: 'corr-1',
    occurredAt: new Date('2024-06-15T10:00:00Z'),
    receivedAt: new Date('2024-06-15T10:00:01Z'),
    metadata: { foo: 'bar' },
    hash: 'abc123',
    prevHash: '000000',
    sequence: 1,
    legalHold: false,
    legalHoldUntil: null,
    ...overrides,
  };
}

describe('ExportService', () => {
  let service: ExportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { forTenant: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        JsonExporter,
        CsvExporter,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  describe('JSON export', () => {
    it('should return JSON string', async () => {
      const events = [makeEvent()];
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue(events) },
      });

      const result = await service.exportEvents('tenant-test', 'json');

      expect(result.contentType).toBe('application/json');
      const parsed = JSON.parse(result.data);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('evt-1');
    });

    it('should return empty array JSON when no events', async () => {
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const result = await service.exportEvents('tenant-test', 'json');

      expect(JSON.parse(result.data)).toEqual([]);
    });

    it('should apply date filters', async () => {
      const mockClient = {
        auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
      };
      prisma.forTenant.mockReturnValue(mockClient);

      await service.exportEvents('tenant-test', 'json', {
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59Z',
      });

      expect(mockClient.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            occurredAt: {
              gte: new Date('2024-01-01T00:00:00Z'),
              lte: new Date('2024-12-31T23:59:59Z'),
            },
          }),
        }),
      );
    });
  });

  describe('CSV export', () => {
    it('should return CSV string with headers', async () => {
      const events = [makeEvent()];
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue(events) },
      });

      const result = await service.exportEvents('tenant-test', 'csv');

      expect(result.contentType).toBe('text/csv');
      expect(result.data).toContain('id,tenantId,sequence');
      expect(result.data).toContain('evt-1');
      expect(result.data).toContain('tenant-test');
    });

    it('should escape commas and quotes in CSV', async () => {
      const events = [
        makeEvent({
          id: 'evt-1',
          actorName: 'Doe, John',
          metadata: { note: 'contains "quotes"' },
        }),
      ];
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue(events) },
      });

      const result = await service.exportEvents('tenant-test', 'csv');

      expect(result.data).toContain('"Doe, John"');
    });

    it('should return headers only for empty events', async () => {
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const result = await service.exportEvents('tenant-test', 'csv');

      const lines = result.data.split('\n');
      expect(lines[0]).toContain('id,tenantId');
      expect(lines).toHaveLength(1);
    });
  });

  describe('format validation', () => {
    it('should throw for unsupported format', async () => {
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
      });

      await expect(
        service.exportEvents('tenant-test', 'xml'),
      ).rejects.toThrow('Unsupported export format: xml');
    });

    it('should support json and csv formats', async () => {
      prisma.forTenant.mockReturnValue({
        auditEvent: { findMany: jest.fn().mockResolvedValue([]) },
      });

      await expect(
        service.exportEvents('tenant-test', 'json'),
      ).resolves.toBeDefined();

      await expect(
        service.exportEvents('tenant-test', 'csv'),
      ).resolves.toBeDefined();
    });
  });
});
