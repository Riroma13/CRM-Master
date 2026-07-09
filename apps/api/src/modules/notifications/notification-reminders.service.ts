import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationRemindersService {
  private readonly logger = new Logger(NotificationRemindersService.name);
  // In-memory set of sent reminders (resets on restart — acceptable for MVP)
  private sentReminders = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkCitaReminders() {
    // Find all tenants with notification config
    const tenants = await this.prisma.admin.tenant.findMany({
      where: { isActive: true },
      select: { id: true, config: true },
    });

    for (const tenant of tenants) {
      const config = (tenant.config as any) ?? {};
      const notifConfig = config.notifications;
      if (!notifConfig?.reminderHours) continue;

      // Configure SMTP for this tenant if they have settings
      if (notifConfig.smtp) {
        this.notifications.configure(notifConfig.smtp);
      }

      const hours = notifConfig.reminderHours;
      const now = new Date();
      const windowStart = new Date(now.getTime() + (hours - 0.1) * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + (hours + 0.1) * 60 * 60 * 1000);

      // Find citas that need reminders
      const citas = await this.prisma.admin.cita.findMany({
        where: {
          tenantId: tenant.id,
          estado: 'confirmada',
          fecha: { gte: windowStart, lte: windowEnd },
          clienteEmail: { not: null },
        },
        include: { resource: { select: { nombre: true } } },
      });

      for (const cita of citas) {
        const key = `${tenant.id}-${cita.id}`;
        if (this.sentReminders.has(key)) continue;

        const clienteNombre = cita.clienteNombre ?? 'Cliente';
        const fechaStr = cita.fecha.toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'long',
          hour: '2-digit', minute: '2-digit',
        });
        const recursoStr = cita.resource?.nombre
          ? ` con ${cita.resource.nombre}`
          : '';

        const ok = await this.notifications.send({
          email: {
            to: cita.clienteEmail!,
            subject: 'Recordatorio de cita — CRM-Master',
            text:
              `Hola ${clienteNombre},\n\n` +
              `Te recordamos que tienes una cita${recursoStr} el ${fechaStr}.\n\n` +
              `Gracias por confiar en nosotros.\nCRM-Master`,
            html:
              `<p>Hola <strong>${clienteNombre}</strong>,</p>` +
              `<p>Te recordamos que tienes una cita${recursoStr} el <strong>${fechaStr}</strong>.</p>` +
              `<hr><p style="color:#666;font-size:12px;">CRM-Master — Portal del cliente</p>`,
          },
        });

        if (ok) {
          this.sentReminders.add(key);
          this.logger.log(`Reminder sent for cita ${cita.id} to ${cita.clienteEmail}`);
        }
      }
    }
  }
}
