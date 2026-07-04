import { createPrismaClient } from '../../../../../packages/database/src';

describe('Scoped Prisma client — raw SQL blocking', () => {
  it('MUST throw when $queryRawUnsafe is called on scoped client', async () => {
    const client = createPrismaClient('tenant-id');
    await expect(
      client.$queryRawUnsafe('SELECT * FROM clientes'),
    ).rejects.toThrow(/raw (SQL|query).*not allowed/i);
  });

  it('MUST throw when $queryRaw is called on scoped client', async () => {
    const client = createPrismaClient('tenant-id');
    await expect(
      client.$queryRaw`SELECT * FROM clientes`,
    ).rejects.toThrow(/raw (SQL|query).*not allowed/i);
  });

  it('MUST throw when $executeRaw is called on scoped client', async () => {
    const client = createPrismaClient('tenant-id');
    await expect(
      client.$executeRaw`UPDATE clientes SET nombre = 'test'`,
    ).rejects.toThrow(/raw (SQL|query).*not allowed/i);
  });

  it('MUST NOT throw on raw SQL for unscoped admin client', async () => {
    // Admin client should still allow raw queries
    const adminClient = createPrismaClient();
    // We cannot actually query without DB, but calling the method should
    // not throw the "raw SQL not allowed" error. It will throw a
    // Prisma connection error instead, which proves the override is NOT active.
    let caught: any;
    try {
      await adminClient.$queryRawUnsafe('SELECT 1');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(caught?.message).not.toMatch(/raw (SQL|query).*not allowed/i);
  });
});

describe('createPrismaClient — unscoped warning', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('MUST warn when called without tenantId in non-test environment', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NODE_ENV = 'development';

    try {
      createPrismaClient();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('without tenantId'),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('MUST NOT warn when called without tenantId in test environment', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NODE_ENV = 'test';

    try {
      createPrismaClient();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('MUST NOT warn when called WITH a tenantId', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    process.env.NODE_ENV = 'development';

    try {
      createPrismaClient('some-tenant-id');
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
