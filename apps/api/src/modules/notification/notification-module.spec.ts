import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma.service';
import { NotificationModule } from './notification.module';
import { DeliveryOrchestrator } from './delivery/delivery-orchestrator';

describe('NotificationModule', () => {
  it('bootstraps the real delivery provider graph with default options', async () => {
    const prismaMock = {} as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      imports: [NotificationModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    const orchestrator = module.get<DeliveryOrchestrator>(DeliveryOrchestrator);

    expect((orchestrator as any).BACKOFF_MS).toEqual([1_000, 5_000, 30_000]);
  });
});
