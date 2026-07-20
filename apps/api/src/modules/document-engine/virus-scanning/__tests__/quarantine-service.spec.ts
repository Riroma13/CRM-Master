import { Test, TestingModule } from '@nestjs/testing';
import { QuarantineService } from '../quarantine-service';
import { PrismaService } from '../../../../common/prisma.service';

describe('QuarantineService', () => {
  let service: QuarantineService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      admin: {
        document: { updateMany: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuarantineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<QuarantineService>(QuarantineService);
  });

  it('should mark document as quarantined', async () => {
    mockPrisma.admin.document.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.markAsQuarantined('doc-1', 't-1')).resolves.toBeUndefined();
    expect(mockPrisma.admin.document.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { documentId: 'doc-1', tenantId: 't-1' },
        data: { status: 'quarantined' },
      }),
    );
  });

  it('should purge expired quarantined documents', async () => {
    mockPrisma.admin.document.findMany.mockResolvedValue([
      { id: '1', documentId: 'doc-1' },
    ]);
    mockPrisma.admin.document.update.mockResolvedValue({});
    const count = await service.purgeExpired();
    expect(count).toBe(1);
  });
});
