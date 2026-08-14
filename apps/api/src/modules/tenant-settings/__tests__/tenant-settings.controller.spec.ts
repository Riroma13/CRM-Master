import 'reflect-metadata';
import { ForbiddenException, ValidationPipe } from '@nestjs/common';

jest.mock('better-auth/plugins/access', () => ({
  createAccessControl: () => ({
    newRole: (permissions: Record<string, string[]>) => ({
      authorize: (requested: Record<string, string[]>) => ({
        success: Object.entries(requested).every(([resource, actions]) =>
          actions.every((action) => permissions[resource]?.includes(action)),
        ),
      }),
    }),
  }),
}));

import { TenantSettingsController } from '../tenant-settings.controller';
import { TenantSettingsDto } from '../tenant-settings.dto';
import { PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

describe('TenantSettingsController', () => {
  it('declares exact configuracion read/update permissions and uses the Host tenant parameter', async () => {
    const service = { getSettings: jest.fn(), updateSettings: jest.fn() };
    const controller = new TenantSettingsController(service as never);

    await controller.getSettings('host-tenant');
    await controller.updateSettings('host-tenant', { name: 'Acme' });
    expect(service.getSettings).toHaveBeenCalledWith('host-tenant');
    expect(service.updateSettings).toHaveBeenCalledWith('host-tenant', { name: 'Acme' });
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.getSettings)).toEqual({
      resource: 'configuracion', action: 'read',
    });
    expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.updateSettings)).toEqual({
      resource: 'configuracion', action: 'update',
    });
  });

  it('denies anonymous and permissionless callers with 403 under the existing guard', () => {
    const audit = { log: jest.fn() };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({ resource: 'configuracion', action: 'read' }),
    };
    const guard = new PermissionsGuard(reflector as never, audit as never);
    const context = (user?: unknown) => ({
      getHandler: () => TenantSettingsController.prototype.getSettings,
      getClass: () => TenantSettingsController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as never;

    expect(() => guard.canActivate(context())).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context({ role: 'lector' }))).toThrow(ForbiddenException);
  });

  it('rejects excluded fields and blank names at the API validation boundary', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    await expect(pipe.transform({ password: 'secret' }, { type: 'body', metatype: TenantSettingsDto })).rejects.toThrow();
    await expect(pipe.transform({ name: '   ' }, { type: 'body', metatype: TenantSettingsDto })).rejects.toThrow();
    await expect(pipe.transform({ logo: null }, { type: 'body', metatype: TenantSettingsDto })).resolves.toEqual({ logo: null });
  });
});
