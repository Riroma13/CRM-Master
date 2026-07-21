import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ActivityTimelineService } from '../activity-timeline/activity-timeline.service';
import { PinoLoggerService } from '../observability/logging/pino-logger.service';

export interface NotificationChannel {
  email?: { to: string; subject: string; text: string; html?: string };
}

@Injectable()
export class NotificationsService {
  private transporter: Transporter | null = null;
  private fromEmail = 'noreply@crm-master.com';

  constructor(
    private readonly logger: PinoLoggerService,
    private readonly activityTimeline?: ActivityTimelineService,
  ) {}

  configure(smtp: { host: string; port: number; user: string; pass: string; fromEmail: string }) {
    this.fromEmail = smtp.fromEmail;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    this.logger.log(`SMTP configured: ${smtp.host}:${smtp.port}`);
  }

  async send(channel: NotificationChannel, publishContext?: { tenantId: string; clienteId?: string; actor?: string }): Promise<boolean> {
    if (channel.email) {
      return this.sendEmail(channel.email, publishContext);
    }
    return false;
  }

  private async sendEmail(opts: { to: string; subject: string; text: string; html?: string }, publishContext?: { tenantId: string; clienteId?: string; actor?: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Would send email to ${opts.to}: ${opts.subject}`);
      this.logger.log(`[EMAIL] To: ${opts.to} | Subject: ${opts.subject}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      this.logger.log(`Email sent to ${opts.to}: ${opts.subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err}`);
      return false;
    }

    if (publishContext?.tenantId && this.activityTimeline) {
      try {
        await this.activityTimeline.publish({
          eventType: 'notificacion.enviada',
          tenantId: publishContext.tenantId,
          clienteId: publishContext.clienteId,
          entityType: 'email',
          entityId: opts.to,
          actor: publishContext.actor ?? 'system',
          sourceModule: 'notifications',
          severity: 'info',
          category: 'communication',
          payload: { to: opts.to, subject: opts.subject },
        });
      } catch (e) {
        this.logger.warn(`Failed to publish notificacion.enviada: ${(e as Error).message}`);
      }
    }

    return true;
  }
}
