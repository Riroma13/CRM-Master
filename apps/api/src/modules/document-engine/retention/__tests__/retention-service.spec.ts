import { Test, TestingModule } from '@nestjs/testing';
import { RetentionService } from '../retention-service';
import { PrismaService } from '../../../../common/prisma.service';

describe('RetentionService', () => {
  let service: RetentionService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      admin: {
        documentTrash: { findMany: jest.fn(), delete: jest.fn() },
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<RetentionService>(RetentionService);
  });

  it('should purge expired trash items', async () => {
    mockPrisma.admin.documentTrash.findMany.mockResolvedValue([
      { id: '1', documentId: 'doc-1' },
      { id: '2', documentId: 'doc-2' },
    ]);
    mockPrisma.admin.documentTrash.delete.mockResolvedValue({});
    const count = await service.purgeExpiredTrash();
    expect(count).toBe(2);
  });

  it('should return 0 when no expired trash', async () => {
    mockPrisma.admin.documentTrash.findMany.mockResolvedValue([]);
    const count = await service.purgeExpiredTrash();
    expect(count).toBe(0);
  });
});
