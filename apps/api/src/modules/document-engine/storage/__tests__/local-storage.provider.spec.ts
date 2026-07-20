import { LocalStorageProvider } from '../local-storage.provider';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('LocalStorageProvider', () => {
  const provider = new LocalStorageProvider();
  const testDir = '/tmp/crm-test-storage';
  const tenantId = 'test-tenant';
  const docId = 'test-doc';
  const versionId = 'v1';

  beforeAll(async () => {
    process.env.DOCUMENT_STORAGE_PATH = testDir;
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should store and retrieve a file', async () => {
    const file = Buffer.from('test content');
    const key = await provider.store(tenantId, docId, versionId, file, 'text/plain');
    const retrieved = await provider.retrieve(key);
    expect(retrieved.toString()).toBe('test content');
  });

  it('should delete a file', async () => {
    const file = Buffer.from('to delete');
    const key = await provider.store(tenantId, 'del-doc', 'v1', file, 'text/plain');
    await provider.delete(key);
    await expect(provider.retrieve(key)).rejects.toThrow();
  });

  it('should generate READ signed URL', async () => {
    const file = Buffer.from('url test');
    const key = await provider.store(tenantId, 'url-doc', 'v1', file, 'text/plain');
    const url = await provider.getSignedUrl(key, 'READ', 3600);
    expect(url).toContain('op=READ');
    expect(url).toContain('exp=');
    expect(url).toContain('token=');
  });

  it('should generate WRITE signed URL', async () => {
    const url = await provider.getSignedUrl('some-key', 'WRITE', 3600);
    expect(url).toContain('op=WRITE');
  });

  it('should generate DELETE signed URL', async () => {
    const url = await provider.getSignedUrl('some-key', 'DELETE', 3600);
    expect(url).toContain('op=DELETE');
  });
});
