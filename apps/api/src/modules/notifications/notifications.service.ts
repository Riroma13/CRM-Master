import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface NotificationChannel {
  email?: { to: string; subject: string; text: string; html?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;
  private fromEmail = 'noreply@crm-master.com';

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

  async send(channel: NotificationChannel): Promise<boolean> {
    if (channel.email) {
      return this.sendEmail(channel.email);
    }
    return false;
  }

  private async sendEmail(opts: { to: string; subject: string; text: string; html?: string }): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`SMTP not configured. Would send email to ${opts.to}: ${opts.subject}`);
      // Simulate sending for demo
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
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${err}`);
      return false;
    }
  }
}
