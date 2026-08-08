import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma.service';
import { ActivityTimelineModule } from '../activity-timeline/activity-timeline.module';
import { ObservabilityModule } from '../observability/observability.module';
import { CommunicationsService } from '../communications/communications.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantEmailModule } from './tenant-email.module';

describe('TenantEmailModule', () => {
  it('bootstraps without ActivityTimelineService and leaves the optional dependency undefined', async () => {
    const module = await Test.createTestingModule({
      imports: [ObservabilityModule, TenantEmailModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(CommunicationsService)
      .useValue({})
      .compile();

    const notifications = module.get(NotificationsService);

    expect((notifications as any).activityTimeline).toBeUndefined();
  });

  it('keeps ActivityTimelineService wired in NotificationsModule', async () => {
    expect(Reflect.getMetadata('imports', NotificationsModule)).toContain(ActivityTimelineModule);
  });
});
