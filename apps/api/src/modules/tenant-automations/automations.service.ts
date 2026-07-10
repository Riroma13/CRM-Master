import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebhookTriggerService } from '../tenant-webhooks/webhook-trigger.service';

export interface Rule { id: number; tenantId: string; nombre: string; trigger: string; activo: boolean; action: { type: string; config: any }; }
export interface Log { id: number; ruleId: number; tenantId: string; trigger: string; result: string; createdAt: string; }

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);
  private rules: Rule[] = []; private logs: Log[] = []; private nextRuleId = 1; private nextLogId = 1;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService, private readonly webhooks: WebhookTriggerService) {}

  getRules(tenantId: string) { return this.rules.filter(r => r.tenantId === tenantId); }
  createRule(tenantId: string, data: { nombre: string; trigger: string; action: { type: string; config: any } }) {
    const rule: Rule = { id: this.nextRuleId++, tenantId, nombre: data.nombre, trigger: data.trigger, activo: true, action: data.action }; this.rules.push(rule); return rule;
  }
  toggleRule(id: number, tenantId: string) { const r = this.rules.find(x => x.id === id && x.tenantId === tenantId); if (r) r.activo = !r.activo; return r; }
  deleteRule(id: number, tenantId: string) { this.rules = this.rules.filter(x => !(x.id === id && x.tenantId === tenantId)); }

  async trigger(tenantId: string, evento: string, data: any) {
    const matching = this.rules.filter(r => r.tenantId === tenantId && r.trigger === evento && r.activo);
    for (const rule of matching) {
      try {
        if (rule.action.type === 'email' && rule.action.config.to) {
          await this.notifications.send({ email: { to: rule.action.config.to, subject: rule.action.config.subject || `Alerta: ${evento}`, text: JSON.stringify(data, null, 2) } });
        }
        if (rule.action.type === 'webhook' && rule.action.config.url) {
          await this.webhooks.trigger(tenantId, evento, data);
        }
        this.logs.push({ id: this.nextLogId++, ruleId: rule.id, tenantId, trigger: evento, result: 'ok', createdAt: new Date().toISOString() });
        this.logger.log(`Rule #${rule.id} '${rule.nombre}' triggered: ${evento}`);
      } catch (err: any) {
        this.logs.push({ id: this.nextLogId++, ruleId: rule.id, tenantId, trigger: evento, result: `error: ${err.message}`, createdAt: new Date().toISOString() });
      }
    }
  }

  getLogs(tenantId: string) { return this.logs.filter(l => l.tenantId === tenantId).slice(-50).reverse(); }
}
