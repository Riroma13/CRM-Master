import { DisponibilidadSchema } from './dto';

describe('DisponibilidadSchema', () => {
  describe('valid configs', () => {
    it('should accept minimal valid config with defaults', () => {
      const result = DisponibilidadSchema.parse({
        dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
      });
      expect(result.timezone).toBe('Europe/Madrid');
      expect(result.slotDuration).toBe(30);
      expect(result.minNotice).toBe(240);
      expect(result.maxDays).toBe(30);
      expect(result.blockedDates).toEqual([]);
      expect(result.dailySchedule).toEqual([
        { day: 1, start: '09:00', end: '14:00' },
      ]);
    });

    it('should accept full valid config', () => {
      const result = DisponibilidadSchema.parse({
        timezone: 'America/New_York',
        slotDuration: 45,
        minNotice: 120,
        maxDays: 14,
        dailySchedule: [
          { day: 1, start: '09:00', end: '13:00' },
          { day: 3, start: '10:00', end: '12:00' },
        ],
        blockedDates: ['2026-08-15', '2026-12-25'],
      });
      expect(result.timezone).toBe('America/New_York');
      expect(result.slotDuration).toBe(45);
      expect(result.blockedDates).toEqual(['2026-08-15', '2026-12-25']);
    });

    it('should accept valid blockedDates with empty array', () => {
      const result = DisponibilidadSchema.parse({
        dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        blockedDates: [],
      });
      expect(result.blockedDates).toEqual([]);
    });

    it('should accept schedule entries for all days 0-6', () => {
      const schedule = Array.from({ length: 7 }, (_, i) => ({
        day: i,
        start: '09:00',
        end: '17:00',
      }));
      const result = DisponibilidadSchema.parse({ dailySchedule: schedule });
      expect(result.dailySchedule.length).toBe(7);
    });
  });

  describe('slotDuration validation', () => {
    it('should reject slotDuration below 15', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          slotDuration: 5,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject slotDuration above 120', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          slotDuration: 180,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject non-integer slotDuration', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          slotDuration: 30.5,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });
  });

  describe('dailySchedule validation', () => {
    it('should reject day below 0', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          dailySchedule: [{ day: -1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject day above 6', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          dailySchedule: [{ day: 7, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject invalid start time format', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          dailySchedule: [{ day: 1, start: '9:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject invalid end time format (no leading zero)', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          dailySchedule: [{ day: 1, start: '09:00', end: '2:00' }],
        }),
      ).toThrow();
    });

    it('should reject schedule with missing day', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          dailySchedule: [{ start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });
  });

  describe('minNotice validation', () => {
    it('should reject minNotice below 60', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          minNotice: 30,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject minNotice above 4320', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          minNotice: 10000,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });
  });

  describe('maxDays validation', () => {
    it('should reject maxDays below 7', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          maxDays: 3,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });

    it('should reject maxDays above 90', () => {
      expect(() =>
        DisponibilidadSchema.parse({
          maxDays: 100,
          dailySchedule: [{ day: 1, start: '09:00', end: '14:00' }],
        }),
      ).toThrow();
    });
  });
});
