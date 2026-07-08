import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import * as fs from 'fs/promises';
import { existsSync, readFileSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'storage-test-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STORAGE_PATH') return tmpDir;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('save', () => {
    it('should write a file to the correct path structure', async () => {
      const result = await service.save('test-tenant', {
        buffer: Buffer.from('contenido de prueba'),
        originalname: 'documento.pdf',
      });

      expect(result.storageKey).toMatch(
        /^tenants\/test-tenant\/documentos\/[a-f0-9-]+\/documento\.pdf$/,
      );
      expect(result.filename).toBe('documento.pdf');

      // Verify the file was actually written to disk
      const fullPath = join(tmpDir, result.storageKey);
      expect(existsSync(fullPath)).toBe(true);
      const content = readFileSync(fullPath, 'utf-8');
      expect(content).toBe('contenido de prueba');
    });
  });

  describe('get', () => {
    it('should return a readable stream for an existing file', async () => {
      // First save a file
      const saved = await service.save('test-tenant', {
        buffer: Buffer.from('archivo para leer'),
        originalname: 'lectura.txt',
      });

      const result = await service.get(saved.storageKey);

      expect(result.filename).toBe('lectura.txt');
      expect(result.stream).toBeDefined();
      expect(typeof result.stream.pipe).toBe('function');

      // Read the stream to verify content
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        result.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        result.stream.on('end', resolve);
        result.stream.on('error', reject);
      });
      expect(Buffer.concat(chunks).toString('utf-8')).toBe('archivo para leer');
    });

    it('should throw NotFoundException for non-existent file', async () => {
      await expect(
        service.get('tenants/nonexistent/documentos/xxx/file.pdf'),
      ).rejects.toThrow('File not found');
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const saved = await service.save('test-tenant', {
        buffer: Buffer.from('archivo a eliminar'),
        originalname: 'para-borrar.txt',
      });

      const fullPath = join(tmpDir, saved.storageKey);
      expect(existsSync(fullPath)).toBe(true);

      await service.delete(saved.storageKey);

      expect(existsSync(fullPath)).toBe(false);
    });

    it('should throw NotFoundException when deleting non-existent file', async () => {
      await expect(
        service.delete('tenants/nonexistent/documentos/xxx/missing.pdf'),
      ).rejects.toThrow('File not found');
    });
  });
});
