import { Controller, Get, Patch, Body } from '@nestjs/common'; import { ApiTags } from '@nestjs/swagger'; import { PrismaService } from '../../common/prisma.service'; import { TenantId } from '../../common/decorators/tenant-id.decorator';
@ApiTags('Plan') @Controller('api/v1/tenant/plan')
export class TenantPlanesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async get(@TenantId() t: string) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: t }, select: { plan: true, planDesde: true, config: true } });
    const config = (tenant?.config as any) ?? {};
    return { plan: tenant?.plan ?? 'gratuito', planDesde: tenant?.planDesde, modulosActivos: config.modules?.length ?? 0, maxStorageMB: config.maxStorageMB ?? 500, maxUsers: config.maxUsers ?? 10 };
  }
  @Patch() async update(@TenantId() t: string, @Body() b: any) { return this.prisma.admin.tenant.update({ where: { id: t }, data: { plan: b.plan, planDesde: new Date() } }); }
}
