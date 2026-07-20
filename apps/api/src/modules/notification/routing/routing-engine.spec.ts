import { RoutingEngine, RoutingResult } from './routing-engine';

describe('RoutingEngine', () => {
  let engine: RoutingEngine;

  beforeEach(() => {
    engine = new RoutingEngine();
  });

  const baseNotification = {
    id: 'notif-1',
    tenantId: 'tenant-1',
    definitionId: 'def-1',
    userId: 'user-1',
    severity: 'info',
    priority: 'normal',
  };

  const baseDefinition = {
    defaultPriority: 'normal',
    defaultSeverity: 'info',
    channels: ['email', 'sms', 'in-app'],
    rules: null,
  };

  describe('preference evaluation', () => {
    it('should route when preferences are enabled', () => {
      const result = engine.route({
        notification: baseNotification,
        definition: baseDefinition,
        preferences: [{ enabled: true, preferredChannels: ['email'], digestFrequency: 'never' }],
      });
      expect(result.channel).toBe('email');
    });

    it('should return null channel when notifications are disabled', () => {
      const result = engine.route({
        notification: baseNotification,
        definition: baseDefinition,
        preferences: [{ enabled: false, preferredChannels: ['email'], digestFrequency: 'never' }],
      });
      expect(result.channel).toBeNull();
    });
  });

  describe('quiet hours', () => {
    it('should calculate delay when inside quiet hours and not bypassing', () => {
      const midQuietHours = new Date();
      midQuietHours.setHours(23, 30, 0, 0);
      jest.useFakeTimers().setSystemTime(midQuietHours);

      const result = engine.route({
        notification: { ...baseNotification, severity: 'info' },
        definition: { ...baseDefinition, bypassQuietHours: false },
        preferences: [{
          enabled: true,
          preferredChannels: ['email'],
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          quietHoursTz: 'UTC',
          digestFrequency: 'never',
        }],
      });

      expect(result.delay).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it('should not delay when bypassQuietHours is true', () => {
      const result = engine.route({
        notification: { ...baseNotification, severity: 'info' },
        definition: { ...baseDefinition, bypassQuietHours: true },
        preferences: [{
          enabled: true,
          preferredChannels: ['email'],
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          quietHoursTz: 'UTC',
          digestFrequency: 'never',
        }],
      });
      expect(result.delay).toBeUndefined();
    });

    it('should bypass quiet hours for critical severity', () => {
      const result = engine.route({
        notification: { ...baseNotification, severity: 'critical' },
        definition: baseDefinition,
        preferences: [{
          enabled: true,
          preferredChannels: ['email'],
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          quietHoursTz: 'UTC',
          digestFrequency: 'never',
        }],
      });
      expect(result.bypassQuietHours).toBe(true);
      expect(result.delay).toBeUndefined();
    });
  });

  describe('channel selection', () => {
    it('should select preferred channel when available', () => {
      const result = engine.route({
        notification: baseNotification,
        definition: { ...baseDefinition, channels: ['email', 'sms'] },
        preferences: [{ enabled: true, preferredChannels: ['sms'], digestFrequency: 'never' }],
      });
      expect(result.channel).toBe('sms');
    });

    it('should fallback to first available channel when preferred not available', () => {
      const result = engine.route({
        notification: baseNotification,
        definition: { ...baseDefinition, channels: ['email'] },
        preferences: [{ enabled: true, preferredChannels: ['sms', 'push'], digestFrequency: 'never' }],
      });
      expect(result.channel).toBe('email');
    });

    it('should provide fallback channels excluding the selected one', () => {
      const result = engine.route({
        notification: baseNotification,
        definition: { ...baseDefinition, channels: ['email', 'sms', 'in-app'] },
        preferences: [{ enabled: true, preferredChannels: ['email'], digestFrequency: 'never' }],
      });
      expect(result.fallbackChannels).toEqual(['sms', 'in-app']);
    });
  });

  describe('critical bypass', () => {
    it('should set bypassQuietHours true for critical severity', () => {
      const result = engine.route({
        notification: { ...baseNotification, severity: 'critical' },
        definition: baseDefinition,
        preferences: [{ enabled: true, preferredChannels: ['email'], digestFrequency: 'never' }],
      });
      expect(result.bypassQuietHours).toBe(true);
    });
  });
});
