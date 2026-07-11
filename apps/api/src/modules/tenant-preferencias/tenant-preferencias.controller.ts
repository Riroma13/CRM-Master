import { Controller, Get, Patch, Body } from '@nestjs/common'; import { ApiTags } from '@nestjs/swagger'; import { PrismaService } from '../../common/prisma.service';
@ApiTags('Preferencias') @Controller('api/v1/tenant/preferencias')
export class TenantPreferenciasController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async get(@Body() body: any) {
    const user = await this.prisma.admin.user.findUnique({ where: { email: body.email }, select: { notifEmail: true, notifWhatsApp: true } });
    return user ?? { notifEmail: true, notifWhatsApp: false };
  }
  @Patch() async update(@Body() body: any) {
    const { email, notifEmail, notifWhatsApp } = body;
    await this.prisma.admin.user.update({ where: { email }, data: { notifEmail, notifWhatsApp } });
    return { success: true };
  }
}
