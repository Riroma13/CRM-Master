## PR-4: Alerting & Pino Migration (FINAL)

### Changes

**A. AlertService** — `apps/api/src/modules/observability/alerting/alert.service.ts`
- `createAlertEvent()`, `resolveAlert()`, `listAlerts()`, `getAlertRules()`

**B. AlertWebhookController** — `apps/api/src/modules/observability/alerting/alert-webhook.controller.ts`
- `POST /api/v1/observability/alerts/webhook` — receives AlertManager payload
- Validates format, creates AlertEvent for firing, resolves for resolved
- Sends notification for critical alerts (via NotificationsService, @Optional)

**C. Prometheus config** — `packages/config/prometheus/`
- `prometheus.yml` — scrape api:3001/metrics every 15s, alertmanager:9093
- `rules/platform.rules.yml` — HighErrorRate, HighLatency, QueueBacklog, InstanceDown

**D. Pino migration (3 modules)**
- WorkflowService, NotificationsService, NotificationRemindersService, AuditService
- Replaced `private readonly logger = new Logger(Xxx.name)` with constructor injection of `PinoLoggerService`
- ObservabilityModule marked @Global() for cross-module injectability

**E. Backward compatibility**
- Tests from PR-1/PR-2/PR-3 remain unchanged
- All 58 observability tests pass
- All 180 workflow/audit/notification tests pass

Closes SPEC-0024 (PR-4 of 4).
