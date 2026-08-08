import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ObservabilityModule } from '../observability.module';
import { PrismaService } from '../../../common/prisma.service';

function providersWithoutPrismaProvider() {
  return (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ObservabilityModule) ?? []).filter(
    (provider: unknown) => provider !== PrismaService,
  );
}

describe('ObservabilityModule Prisma ownership', () => {
  it('cannot bootstrap the real AlertService graph without the local Prisma provider', async () => {
    let error: unknown;
    try {
      await Test.createTestingModule({
        providers: providersWithoutPrismaProvider(),
      }).compile();
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('PrismaService');
  });

  it('bootstraps with an isolated Prisma mock and keeps ownership local', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ObservabilityModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ObservabilityModule);
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ObservabilityModule);

    expect(moduleRef.get(PrismaService)).toEqual({});
    expect(providers).toContain(PrismaService);
    expect(exports).not.toContain(PrismaService);
    await moduleRef.close();
  });
});
