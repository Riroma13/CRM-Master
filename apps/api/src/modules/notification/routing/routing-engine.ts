import { Injectable, Logger } from '@nestjs/common';
import type { ChannelType, Priority, Severity } from '@shared/notification';

interface RoutingInput {
  notification: {
    id: string;
    tenantId: string;
    definitionId: string;
    userId: string;
    severity: string;
    priority: string;
  };
  definition: {
    defaultPriority: string;
    defaultSeverity: string;
    channels: string[];
    rules?: any;
    bypassQuietHours?: boolean;
  };
  preferences: Array<{
    enabled: boolean;
    category?: string;
    preferredChannels: string[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursTz?: string;
    digestFrequency: string;
  }>;
}

export interface RoutingResult {
  channel: ChannelType;
  fallbackChannels: ChannelType[];
  priority: Priority;
  delay?: number;
  bypassQuietHours: boolean;
}

@Injectable()
export class RoutingEngine {
  private readonly logger = new Logger(RoutingEngine.name);

  route(input: RoutingInput): RoutingResult {
    const { notification, definition, preferences } = input;
    const effectivePrefs = this.mergePreferences(preferences);
    const severity = notification.severity as Severity;
    const bypassQuietHours = definition.bypassQuietHours === true || severity === 'critical';

    if (!effectivePrefs.enabled) {
      this.logger.debug(`Notification ${notification.id}: user has disabled notifications`);
      return {
        channel: null as any,
        fallbackChannels: [],
        priority: notification.priority as Priority,
        bypassQuietHours: true,
      };
    }

    const availableChannels = definition.channels as ChannelType[];
    const preferredChannels = effectivePrefs.preferredChannels as ChannelType[];
    const channel = this.selectChannel(availableChannels, preferredChannels, severity);
    const fallbackChannels = this.getFallbackChannels(channel, availableChannels);
    const priority = this.resolvePriority(definition.defaultPriority as Priority, notification.priority as Priority, severity);
    const delay = this.calculateDelay(bypassQuietHours, effectivePrefs);

    return { channel, fallbackChannels, priority, delay, bypassQuietHours };
  }

  private mergePreferences(prefs: RoutingInput['preferences']) {
    const global = prefs.find(p => !p.category);
    const enabled = global ? global.enabled : true;
    const preferredChannels = global?.preferredChannels ?? [];
    const quietHoursStart = global?.quietHoursStart;
    const quietHoursEnd = global?.quietHoursEnd;
    const quietHoursTz = global?.quietHoursTz;
    const digestFrequency = global?.digestFrequency ?? 'never';

    return { enabled, preferredChannels, quietHoursStart, quietHoursEnd, quietHoursTz, digestFrequency };
  }

  private selectChannel(
    available: ChannelType[],
    preferred: ChannelType[],
    severity: Severity,
  ): ChannelType {
    if (severity === 'critical') {
      return preferred.find(c => available.includes(c)) || available[0] || 'email';
    }
    const match = preferred.find(c => available.includes(c));
    if (match) return match;
    return available[0] || 'email';
  }

  private getFallbackChannels(selected: ChannelType, available: ChannelType[]): ChannelType[] {
    return available.filter(c => c !== selected);
  }

  private resolvePriority(defaultPriority: Priority, notificationPriority: Priority, severity: Severity): Priority {
    if (severity === 'critical') return 'critical';
    if (severity === 'error' && notificationPriority !== 'critical') return 'high';
    return notificationPriority || defaultPriority;
  }

  private calculateDelay(bypassQuietHours: boolean, prefs: { quietHoursStart?: string; quietHoursEnd?: string; quietHoursTz?: string }): number | undefined {
    if (bypassQuietHours) return undefined;
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return undefined;

    const now = new Date();
    const tz = prefs.quietHoursTz || 'UTC';
    const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

    const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
    const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return (endMinutes - currentMinutes) * 60 * 1000;
      }
    } else {
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        if (currentMinutes >= startMinutes) {
          return ((24 * 60 - currentMinutes) + endMinutes) * 60 * 1000;
        }
        return (endMinutes - currentMinutes) * 60 * 1000;
      }
    }
    return undefined;
  }
}
