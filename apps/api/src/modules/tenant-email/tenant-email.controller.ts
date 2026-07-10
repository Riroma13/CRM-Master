import { Controller, Post, Body } from '@nestjs/common'; import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenantId } from '../../common/decorators/tenant-id.decorator'; import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../common/prisma.service'; import { CommunicationsService } from '../communications/communications.service';

@ApiTags('Tenant - Email') @Controller('api/v1/tenant/email')
export class TenantEmailController {
  constructor(private readonly notifications: NotificationsService, private readonly prisma: PrismaService, private readonly comms: CommunicationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Enviar email desde el CRM' })
  async send(@TenantId() tenantId: string, @Body() body: { to: string; subject: string; text: string; clienteId?: string }) {
    const tenant = await this.prisma.admin.tenant.findUnique({ where: { id: tenantId } });
    const config = ((tenant?.config as any) ?? {}).notifications ?? {};
    if (config.smtp) this.notifications.configure(config.smtp);

    const ok = await this.notifications.send({ email: { to: body.to, subject: body.subject, text: body.text, html: body.text.replace(/\n/g, '<br>') } });
    if (body.clienteId) {
      this.comms.log({ tenantId, clienteId: body.clienteId, tipo: 'email', titulo: body.subject, descripcion: `Enviado a ${body.to}: ${body.text.slice(0, 200)}` });
    }
    return { sent: ok };
  }
}
