import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Tenant - Notificaciones')
@ApiBearerAuth()
@Controller('api/v1/tenant/notifications-config')
export class NotificationsConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener configuración de notificaciones del tenant' })
  async getConfig(@TenantId() tenantId: string) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    const config = ((tenant?.config as any) ?? {}).notifications ?? {};
    return {
      smtpConfigured: !!(config.smtp?.host && config.smtp?.user),
      reminderHours: config.reminderHours ?? 24,
      smtp: config.smtp
        ? { host: config.smtp.host, port: config.smtp.port, user: config.smtp.user, fromEmail: config.smtp.fromEmail }
        : null,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar configuración de notificaciones' })
  async updateConfig(@TenantId() tenantId: string, @Body() body: any) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    const config = (tenant?.config as any) ?? {};
    config.notifications = {
      smtp: body.smtp || null,
      reminderHours: body.reminderHours ?? 24,
    };

    await this.prisma.admin.tenant.update({
      where: { id: tenantId },
      data: { config: config as any },
    });

    // Apply SMTP config immediately so next reminder uses it
    if (body.smtp?.host && body.smtp?.user) {
      this.notifications.configure(body.smtp);
    }

    return { success: true };
  }
}
