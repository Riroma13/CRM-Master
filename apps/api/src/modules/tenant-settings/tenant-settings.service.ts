import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantProfileService } from '../tenant-profile/tenant-profile.service';
import { TenantSettingsDto } from './tenant-settings.dto';

export interface TenantIdentitySettings {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  isActive: boolean;
}

@Injectable()
export class TenantSettingsService {
  constructor(private readonly profile: TenantProfileService) {}

  async getSettings(tenantId: string): Promise<TenantIdentitySettings> {
    return this.mapIdentity(await this.profile.getProfile(tenantId));
  }

  async updateSettings(tenantId: string, input: TenantSettingsDto): Promise<TenantIdentitySettings> {
    this.assertAllowedKeys(input);
    const result = await this.profile.updateProfile(tenantId, input);
    return this.mapIdentity(result);
  }

  assertAllowedKeys(input: object): void {
    const allowed = new Set(['name', 'logo']);
    const invalid = Object.keys(input).find((key) => !allowed.has(key));
    if (invalid) throw new BadRequestException(`Campo no permitido: ${invalid}`);
  }

  private mapIdentity(profile: Record<string, unknown>): TenantIdentitySettings {
    return {
      id: profile.id as string,
      slug: profile.slug as string,
      name: profile.name as string,
      logo: (profile.logo as string | null) ?? null,
      isActive: profile.isActive as boolean,
    };
  }
}
