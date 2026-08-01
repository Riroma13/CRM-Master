import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../../../common/auth', () => ({ createAuth: jest.fn() }));
import { IdentityModule } from '../identity.module';
import { PrismaService } from '../../../common/prisma.service';
import { AUTH_CLIENT } from '../../../common/auth-client.provider';

function providersWithoutPrismaProvider() {
  return (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, IdentityModule) ?? []).filter(
    (provider: unknown) => provider !== PrismaService,
  );
}

describe('IdentityModule Prisma ownership', () => {
  it('cannot bootstrap the real Identity provider graph without the local Prisma provider', async () => {
    let error: unknown;
    try {
      await Test.createTestingModule({ providers: providersWithoutPrismaProvider() }).compile();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('PrismaService');
  });

  it('bootstraps with isolated Prisma and auth mocks and keeps Prisma ownership local', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [IdentityModule] })
      .overrideProvider(PrismaService)
      .useValue({ $client: {} })
      .overrideProvider(AUTH_CLIENT)
      .useValue({})
      .compile();
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, IdentityModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, IdentityModule);

    expect(moduleRef.get(PrismaService)).toEqual({ $client: {} });
    expect(providers).toContain(PrismaService);
    expect(exports).not.toContain(PrismaService);
    await moduleRef.close();
  });
});
