import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, GoneException } from '@nestjs/common';
import { Readable, PassThrough } from 'stream';
import { SharedController } from './shared.controller';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from './storage.service';

describe('SharedController', () => {
  let controller: SharedController;
  let prisma: any;
  let storageService: jest.Mocked<StorageService>;

  const NOW = new Date();

  const baseShareLink = {
    id: 'share-1',
    documentoId: 'doc-1',
    token: 'shr_validtoken1234567890123456789012345678901234567890',
    expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days ahead
    maxDownloads: 5,
    downloadCount: 0,
    createdBy: 'user-1',
    createdAt: NOW,
    documento: {
      id: 'doc-1',
      tenantId: 'tenant-1',
      filename: 'modelo-303.pdf',
      storageKey: 'tenants/test-tenant/documentos/uuid/modelo-303.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 245760,
      category: 'modelo',
      isDeleted: false,
      uploadedBy: 'user-1',
      createdAt: NOW,
      updatedAt: NOW,
    },
  };

  /**
   * Creates a minimal mock Express Response that satisfies the Writable
   * interface required by stream.pipe().
   */
  function createMockRes(): any {
    const stream = new PassThrough();
    return Object.assign(stream, {
      setHeader: jest.fn(),
    });
  }

  beforeEach(async () => {
    const mockPrisma = {
      admin: {
        shareLink: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      },
    };

    const mockStorageService = {
      get: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharedController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    controller = module.get<SharedController>(SharedController);
    prisma = module.get(PrismaService);
    storageService = module.get(StorageService) as any;
  });

  describe('download', () => {
    it('should return 200 and stream file for valid token', async () => {
      prisma.admin.shareLink.findUnique.mockResolvedValue(baseShareLink);
      prisma.admin.shareLink.update.mockResolvedValue({
        ...baseShareLink,
        downloadCount: 1,
      });

      const mockStream = new Readable({
        read() {
          this.push(Buffer.from('contenido del pdf'));
          this.push(null);
        },
      });
      storageService.get.mockResolvedValue({
        stream: mockStream as any,
        filename: 'modelo-303.pdf',
      });

      const res = createMockRes();
      await controller.download(
        'shr_validtoken1234567890123456789012345678901234567890',
        res,
      );

      // Verify database lookup
      expect(prisma.admin.shareLink.findUnique).toHaveBeenCalledWith({
        where: { token: 'shr_validtoken1234567890123456789012345678901234567890' },
        include: { documento: true },
      });

      // Verify storage retrieval
      expect(storageService.get).toHaveBeenCalledWith(
        baseShareLink.documento.storageKey,
      );

      // Verify download count incremented
      expect(prisma.admin.shareLink.update).toHaveBeenCalledWith({
        where: { id: baseShareLink.id },
        data: { downloadCount: { increment: 1 } },
      });

      // Verify response headers
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="modelo-303.pdf"',
      );
    });

    it('should throw 410 Gone when token is expired', async () => {
      const expiredLink = {
        ...baseShareLink,
        expiresAt: new Date(NOW.getTime() - 1000), // 1 second ago
      };
      prisma.admin.shareLink.findUnique.mockResolvedValue(expiredLink);

      const res = createMockRes();
      await expect(
        controller.download('shr_expiredtoken', res),
      ).rejects.toThrow(GoneException);

      // Verify no storage or header interaction occurs
      expect(storageService.get).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should throw 410 Gone when maxDownloads reached', async () => {
      const exhaustedLink = {
        ...baseShareLink,
        maxDownloads: 5,
        downloadCount: 5,
      };
      prisma.admin.shareLink.findUnique.mockResolvedValue(exhaustedLink);

      const res = createMockRes();
      await expect(
        controller.download('shr_exhaustedtoken', res),
      ).rejects.toThrow(GoneException);

      expect(storageService.get).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should throw 404 NotFound when documento is soft-deleted', async () => {
      const deletedDocLink = {
        ...baseShareLink,
        documento: { ...baseShareLink.documento, isDeleted: true },
      };
      prisma.admin.shareLink.findUnique.mockResolvedValue(deletedDocLink);

      const res = createMockRes();
      await expect(
        controller.download('shr_deleteddoctoken', res),
      ).rejects.toThrow(NotFoundException);

      expect(storageService.get).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should throw 404 NotFound when token does not exist', async () => {
      prisma.admin.shareLink.findUnique.mockResolvedValue(null);

      const res = createMockRes();
      await expect(
        controller.download('shr_nonexistent', res),
      ).rejects.toThrow(NotFoundException);

      expect(storageService.get).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });
});
