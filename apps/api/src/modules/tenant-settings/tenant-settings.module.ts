import { Module } from '@nestjs/common';
import { TenantProfileModule } from '../tenant-profile/tenant-profile.module';
import { TenantSettingsController } from './tenant-settings.controller';
import { TenantSettingsService } from './tenant-settings.service';

@Module({
  imports: [TenantProfileModule],
  controllers: [TenantSettingsController],
  providers: [TenantSettingsService],
})
export class TenantSettingsModule {}
