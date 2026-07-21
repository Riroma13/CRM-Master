export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

export interface AlertEvent {
  id: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  value: number;
  threshold: number;
  message: string;
  startedAt: string;
  resolvedAt?: string;
}
