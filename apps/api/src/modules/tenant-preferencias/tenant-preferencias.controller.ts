import { Controller, Get, Patch, NotFoundException, Req } from '@nestjs/common'; import { ApiTags } from '@nestjs/swagger'; import { PrismaService } from '../../common/prisma.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
@ApiTags('Preferencias') @Controller('api/v1/tenant/preferencias')
export class TenantPreferenciasController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async get(@Req() request: { user: { id: string } }, @TenantId() tenantId: string) {
    const user = await this.findScopedUser(request.user.id, tenantId);
    return { notifEmail: user.notifEmail, notifWhatsApp: user.notifWhatsApp };
  }
  @Patch() async update(@Req() request: { user: { id: string }; body: any }, @TenantId() tenantId: string) {
    const user = await this.findScopedUser(request.user.id, tenantId);
    const { notifEmail, notifWhatsApp } = request.body;
    await this.prisma.admin.legacyUser.update({
      where: { id: user.id },
      data: { notifEmail, notifWhatsApp },
    });
    return { success: true };
  }

  private async findScopedUser(betterAuthUserId: string, tenantId: string) {
    const user = await this.prisma.admin.legacyUser.findFirst({
      where: { betterAuthUserId, tenantId },
      select: { id: true, notifEmail: true, notifWhatsApp: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado en este tenant');
    return user;
  }
}
