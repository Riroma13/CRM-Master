import { Test, TestingModule } from '@nestjs/testing';
import { randomBytes } from 'crypto';
import { DocumentosService } from './documentos.service';
import { PrismaService } from '../../common/prisma.service';

describe('DocumentosService', () => {
  let service: DocumentosService;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  // Use highly unique IDs to avoid collisions with other test suites
  const TENANT_A_ID = 'd7ten-docs-0000-4000-8000-0000000000a1';
  const TENANT_B_ID = 'd7ten-docs-0000-4000-8000-0000000000b1';
  const USER_ID = 'd7usr-docs-0000-4000-8000-0000000000u1';

  const DOC_IDS = {
    a1: 'd7doc-docs-0000-4000-8000-00000000a001',
    a2: 'd7doc-docs-0000-4000-8000-00000000a002',
    b1: 'd7doc-docs-0000-4000-8000-00000000b001',
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [DocumentosService, PrismaService],
    }).compile();

    service = moduleRef.get(DocumentosService);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();

    // Clean residual data — delete ALL documents for these tenants first
    // (not just by specific IDs) to handle stale data from previous runs
    await prisma.admin.shareLink.deleteMany({
      where: {
        documento: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      },
    });
    await prisma.admin.documento.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });

    // Seed tenants
    for (const t of [
      { id: TENANT_A_ID, slug: 'docs-svc-a', name: 'Docs Service A' },
      { id: TENANT_B_ID, slug: 'docs-svc-b', name: 'Docs Service B' },
    ]) {
      await prisma.admin.tenant.upsert({
        where: { id: t.id },
        update: {},
        create: { id: t.id, slug: t.slug, name: t.name, isActive: true },
      });
    }
  });

  afterAll(async () => {
    await prisma.admin.shareLink.deleteMany({
      where: {
        documento: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      },
    });
    await prisma.admin.documento.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    if (moduleRef) await moduleRef.close();
  });

  describe('create', () => {
    let createdDocId: string;

    afterEach(async () => {
      // Clean up the created document
      if (createdDocId) {
        await prisma.admin.documento.deleteMany({
          where: { id: createdDocId },
        });
      }
    });

    it('should create a document record scoped to the tenant', async () => {
      const doc = await service.create(TENANT_A_ID, {
        filename: 'contrato.pdf',
        storageKey: `tenants/docs-svc-a/documentos/uuid/contrato.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        category: 'contrato',
        description: 'Contrato de prueba',
        uploadedBy: USER_ID,
      });

      createdDocId = doc.id;
      expect(doc.id).toBeDefined();
      expect(doc.filename).toBe('contrato.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.category).toBe('contrato');
      expect(doc.description).toBe('Contrato de prueba');
    });
  });

  describe('findAll', () => {
    beforeAll(async () => {
      // Clear any documents left from previous tests, then seed fresh data
      await prisma.admin.documento.deleteMany({
        where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
      });

      await prisma.admin.documento.createMany({
        data: [
          {
            id: DOC_IDS.a1,
            tenantId: TENANT_A_ID,
            filename: 'factura-enero.pdf',
            storageKey: `tenants/docs-svc-a/documentos/u1/factura-enero.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            category: 'factura',
            uploadedBy: USER_ID,
          },
          {
            id: DOC_IDS.a2,
            tenantId: TENANT_A_ID,
            filename: 'informe-anual.pdf',
            storageKey: `tenants/docs-svc-a/documentos/u2/informe-anual.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 4096,
            category: 'informe',
            uploadedBy: USER_ID,
          },
          {
            id: DOC_IDS.b1,
            tenantId: TENANT_B_ID,
            filename: 'modelo-303.pdf',
            storageKey: `tenants/docs-svc-b/documentos/u3/modelo-303.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 3072,
            category: 'modelo',
            uploadedBy: USER_ID,
          },
        ],
      });
    });

    it('should return only documents for the given tenant', async () => {
      const docs = await service.findAll(TENANT_A_ID);
      expect(docs.length).toBe(2);
      docs.forEach((d) => {
        expect(d.filename).toMatch(/factura-enero|informe-anual/);
      });
    });

    it('should return documents in descending order by createdAt', async () => {
      const docs = await service.findAll(TENANT_A_ID);
      expect(docs.length).toBe(2);
      // Most recent first
      const timestamps = docs.map((d) => new Date(d.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    it('should NOT include soft-deleted documents', async () => {
      // Soft-delete one document
      await service.softDelete(TENANT_A_ID, DOC_IDS.a1);
      const docs = await service.findAll(TENANT_A_ID);
      expect(docs.length).toBe(1);
      expect(docs[0].id).toBe(DOC_IDS.a2);

      // Restore for other tests
      await prisma.admin.documento.update({
        where: { id: DOC_IDS.a1 },
        data: { isDeleted: false },
      });
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const doc = await service.findOne(TENANT_A_ID, DOC_IDS.a1);
      expect(doc.id).toBe(DOC_IDS.a1);
      expect(doc.filename).toBe('factura-enero.pdf');
    });

    it('should throw NotFoundException for non-existent document', async () => {
      await expect(
        service.findOne(TENANT_A_ID, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Documento no encontrado');
    });
  });

  describe('update', () => {
    it('should update document metadata', async () => {
      const updated = await service.update(TENANT_A_ID, DOC_IDS.a1, {
        category: 'otro',
        description: 'Descripción actualizada',
      });

      expect(updated.category).toBe('otro');
      expect(updated.description).toBe('Descripción actualizada');
    });
  });

  describe('softDelete', () => {
    it('should mark document as deleted', async () => {
      await service.softDelete(TENANT_A_ID, DOC_IDS.a2);

      // Verify it's no longer returned in findAll
      const docs = await service.findAll(TENANT_A_ID);
      const found = docs.find((d) => d.id === DOC_IDS.a2);
      expect(found).toBeUndefined();

      // Restore
      await prisma.admin.documento.update({
        where: { id: DOC_IDS.a2 },
        data: { isDeleted: false },
      });
    });
  });

  describe('createShareLink', () => {
    it('should create a share link with valid token', async () => {
      const link = await service.createShareLink(
        TENANT_A_ID,
        DOC_IDS.a1,
        { expiresIn: '7d', maxDownloads: 5 },
        USER_ID,
      );

      expect(link.token).toMatch(/^shr_[a-f0-9]{64}$/);
      expect(link.url).toBe(`/api/v1/shared/${link.token}`);
      expect(link.maxDownloads).toBe(5);
      expect(link.expiresAt).toBeDefined();
      expect(link.downloadCount).toBe(0);
    });

    it('should throw NotFoundException for non-existent document', async () => {
      await expect(
        service.createShareLink(
          TENANT_A_ID,
          '00000000-0000-0000-0000-000000000000',
          { expiresIn: '7d' },
          USER_ID,
        ),
      ).rejects.toThrow('Documento no encontrado');
    });
  });

  describe('cross-tenant isolation', () => {
    it('should not allow tenant A to see documents from tenant B', async () => {
      const docsA = await service.findAll(TENANT_A_ID);
      const docsB = await service.findAll(TENANT_B_ID);

      const idsA = docsA.map((d) => d.id);
      const idsB = docsB.map((d) => d.id);

      // No overlap
      const intersection = idsA.filter((id) => idsB.includes(id));
      expect(intersection).toEqual([]);

      // Correct counts
      expect(docsA.length).toBe(2); // a1 + a2
      expect(docsB.length).toBe(1); // b1
    });
  });
});
