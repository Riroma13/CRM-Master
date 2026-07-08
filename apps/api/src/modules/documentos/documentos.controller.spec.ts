import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DocumentosController } from './documentos.controller';
import { DocumentosService } from './documentos.service';
import { StorageService } from './storage.service';

describe('DocumentosController', () => {
  let controller: DocumentosController;
  let documentosService: jest.Mocked<DocumentosService>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(async () => {
    const mockDocumentosService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createShareLink: jest.fn(),
    };

    const mockStorageService = {
      save: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentosController],
      providers: [
        { provide: DocumentosService, useValue: mockDocumentosService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    controller = module.get<DocumentosController>(DocumentosController);
    documentosService = module.get(DocumentosService) as any;
    storageService = module.get(StorageService) as any;
  });

  describe('upload', () => {
    it('should upload a file and create document record', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'documento.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const mockReq = {
        tenantSlug: 'test-tenant',
        user: { id: 'user-1' },
      } as any;

      storageService.save.mockResolvedValue({
        storageKey: 'tenants/test-tenant/documentos/uuid/documento.pdf',
        filename: 'documento.pdf',
      });

      documentosService.create.mockResolvedValue({
        id: 'doc-1',
        filename: 'documento.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        category: 'contrato',
        description: 'Test document',
        createdAt: new Date().toISOString(),
      });

      const result = await controller.upload(
        'tenant-id-1',
        mockFile,
        { category: 'contrato', description: 'Test document' },
        mockReq,
      );

      expect(storageService.save).toHaveBeenCalledWith('test-tenant', {
        buffer: mockFile.buffer,
        originalname: 'documento.pdf',
      });

      expect(documentosService.create).toHaveBeenCalledWith(
        'tenant-id-1',
        expect.objectContaining({
          filename: 'documento.pdf',
          storageKey: 'tenants/test-tenant/documentos/uuid/documento.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          category: 'contrato',
          uploadedBy: 'user-1',
        }),
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('doc-1');
    });

    it('should throw BadRequestException when no file is provided', async () => {
      const mockReq = { tenantSlug: 'test-tenant', user: { id: 'user-1' } } as any;

      await expect(
        controller.upload('tenant-id-1', undefined, {}, mockReq),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return list of documents for the tenant', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          filename: 'doc1.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          category: 'factura',
          createdAt: new Date().toISOString(),
        },
      ];

      documentosService.findAll.mockResolvedValue(mockDocs);

      const result = await controller.findAll('tenant-id-1');
      expect(result).toEqual(mockDocs);
      expect(documentosService.findAll).toHaveBeenCalledWith('tenant-id-1');
    });
  });
});
