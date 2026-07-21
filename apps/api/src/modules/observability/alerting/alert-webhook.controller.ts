import { Controller, Post, Body, HttpCode, HttpStatus, Optional, Inject, Logger } from '@nestjs/common';
import { AlertService } from './alert.service';
import { NotificationsService } from '../../notifications/notifications.service';

export interface AlertManagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  values?: Record<string, number>;
}

export interface AlertManagerPayload {
  status: 'firing' | 'resolved';
  alerts: AlertManagerAlert[];
  groupLabels?: Record<string, string>;
  commonLabels?: Record<string, string>;
  commonAnnotations?: Record<string, string>;
}

@Controller('api/v1/observability/alerts')
export class AlertWebhookController {
  private readonly logger = new Logger(AlertWebhookController.name);

  constructor(
    private readonly alertService: AlertService,
    @Optional() @Inject(NotificationsService) private readonly notifications?: NotificationsService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(@Body() payload: AlertManagerPayload) {
    if (!payload.alerts || !Array.isArray(payload.alerts)) {
      this.logger.warn('Invalid AlertManager payload: missing alerts array');
      return { received: 0, errors: 1 };
    }

    let received = 0;
    let errors = 0;

    for (const alert of payload.alerts) {
      try {
        const ruleName = alert.labels?.alertname ?? 'unknown';
        const severity = alert.labels?.severity ?? 'warning';
        const value = alert.values?.value ?? 0;
        const threshold = alert.labels?.threshold ? parseFloat(alert.labels.threshold) : 0;
        const message = alert.annotations?.summary ?? alert.annotations?.description ?? `${ruleName} is firing`;

        if (alert.status === 'firing') {
          await this.alertService.createAlertEvent(ruleName, severity, value, threshold, message, alert.startsAt);
          if (severity === 'critical' && this.notifications) {
            await this.notifications.send({
              email: {
                to: 'ops@crm-master.com',
                subject: `[CRITICAL] ${ruleName}`,
                text: `Alert: ${ruleName}\nSeverity: ${severity}\nValue: ${value}\nMessage: ${message}`,
              },
            });
          }
        } else if (alert.status === 'resolved') {
          await this.alertService.resolveAlert(ruleName);
        }
        received++;
      } catch (err) {
        this.logger.error(`Failed to process alert: ${(err as Error).message}`);
        errors++;
      }
    }

    return { received, errors };
  }
}
