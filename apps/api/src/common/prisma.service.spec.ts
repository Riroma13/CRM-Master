const mockPrismaState = { constructions: 0, bases: [] as any[] };

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => {
    const base: any = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $extends: jest.fn((extension: any) => ({
        __baseClient: base,
        __extension: extension,
        $connect: base.$connect,
        $disconnect: base.$disconnect,
        $extends: base.$extends,
      })),
    };
    mockPrismaState.constructions += 1;
    mockPrismaState.bases.push(base);
    return base;
  }),
}));

import { PrismaService } from './prisma.service';

describe('PrismaService shared client lifecycle', () => {
  it('shares one base across facades and keeps tenant wrappers fresh', async () => {
    const first = new PrismaService();
    const second = new PrismaService();

    expect(mockPrismaState.constructions).toBe(1);
    expect(first.admin).toBe(second.$client);

    const tenantA = first.forTenant('tenant-a') as any;
    const tenantB = second.forTenant('tenant-b') as any;
    expect(tenantA).not.toBe(tenantB);
    expect(tenantA.__baseClient).toBe((first.admin as any).__baseClient);
    expect(tenantB.__baseClient).toBe((first.admin as any).__baseClient);
  });

  it('derives reporting access from the shared base and targets it for lifecycle', async () => {
    const prisma = new PrismaService();
    const reporting = prisma.forReporting('tenant-a') as any;
    const base = prisma.admin as any;

    expect(reporting.__baseClient).toBe(base.__baseClient);
    await prisma.onModuleInit();
    await prisma.onModuleDestroy();
    expect(base.$connect).toHaveBeenCalledTimes(1);
    expect(base.$disconnect).toHaveBeenCalledTimes(1);
  });
});
