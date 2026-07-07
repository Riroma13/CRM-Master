import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { LocalCalendarProvider } from './local-calendar-provider';

describe('LocalCalendarProvider', () => {
  let provider: LocalCalendarProvider;
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  const TENANT_A_ID = 'd5p00000-0000-4000-8000-000000000001';
  const TENANT_B_ID = 'd5p00000-0000-4000-8000-000000000002';

  /**
   * Helper: upserts disponibilidad for a tenant with a given config.
   * Allows each test to control the disponibilidad independently.
   */
  /**
   * Ensures the test tenant exists and upserts disponibilidad config.
   *
   * Uses atomic upsert for the tenant to avoid race conditions when
   * other test suites (clients/dashboard) run `deleteMany({})` on
   * the tenants table in parallel workers.
   */
  async function setupDisponibilidad(
    tenantId: string,
    overrides: Partial<{
      minNotice: number;
      slotDuration: number;
      dailySchedule: { day: number; start: string; end: string }[];
      blockedDates: string[];
      timezone: string;
    }> = {},
  ) {
    const slug =
      tenantId === TENANT_A_ID ? 'cal-provider-a' : 'cal-provider-b';

    // Atomic upsert: ensures tenant exists regardless of other workers' cleanups
    await prisma.admin.tenant.upsert({
      where: { id: tenantId },
      update: { isActive: true },
      create: {
        id: tenantId,
        slug: `${slug}-${Date.now()}`,
        name: `${slug} (auto)`,
        isActive: true,
      },
    });

    const timezone = overrides.timezone ?? 'Europe/Madrid';
    const slotDuration = overrides.slotDuration ?? 30;
    const minNotice = overrides.minNotice ?? 0;
    const maxDays = 90;
    const dailySchedule =
      overrides.dailySchedule ?? [
        { day: 1, start: '09:00', end: '13:00' }, // Monday
        { day: 3, start: '09:00', end: '12:00' }, // Wednesday
      ];
    const blockedDates = overrides.blockedDates ?? [];

    await prisma.admin.disponibilidad.upsert({
      where: { tenantId },
      create: { tenantId, timezone, slotDuration, minNotice, maxDays, dailySchedule, blockedDates },
      update: { timezone, slotDuration, minNotice, maxDays, dailySchedule, blockedDates },
    });
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [LocalCalendarProvider, PrismaService],
    }).compile();

    provider = moduleRef.get(LocalCalendarProvider);
    prisma = moduleRef.get(PrismaService);
    await moduleRef.init();

    // Clean any residual data
    await prisma.admin.cita.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.disponibilidad.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });

    // Seed test tenants (upsert to survive parallel worker cleanups)
    for (const t of [
      { id: TENANT_A_ID, slug: 'cal-provider-a', name: 'Calendar Provider A' },
      { id: TENANT_B_ID, slug: 'cal-provider-b', name: 'Calendar Provider B' },
    ]) {
      await prisma.admin.tenant.upsert({
        where: { id: t.id },
        update: {},
        create: { id: t.id, slug: t.slug, name: t.name, isActive: true },
      });
    }
  });

  afterAll(async () => {
    await prisma.admin.cita.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.disponibilidad.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    await prisma.admin.tenant.deleteMany({
      where: { id: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
    if (moduleRef) await moduleRef.close();
  });

  afterEach(async () => {
    // Clean citas between tests
    await prisma.admin.cita.deleteMany({
      where: { tenantId: { in: [TENANT_A_ID, TENANT_B_ID] } },
    });
  });

  // ───── getSlots ───────────────────────────────────────────────

  describe('getSlots', () => {
    it('should generate correct slots for a configured day', async () => {
      // Monday 2026-08-03 (getUTCDay() === 1) → 2 windows of 30min slots
      // 09:00-13:00 = 4h = 8 slots of 30min
      await setupDisponibilidad(TENANT_A_ID, {
        dailySchedule: [{ day: 1, start: '09:00', end: '13:00' }],
      });

      const date = new Date('2026-08-03T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);

      expect(slots.length).toBe(8);
      expect(slots[0].start.toISOString()).toBe('2026-08-03T09:00:00.000Z');
      expect(slots[0].available).toBe(true);
      // Last slot: 12:30-13:00 (index 7)
      expect(slots[7].start.toISOString()).toBe('2026-08-03T12:30:00.000Z');
      expect(slots[7].end.toISOString()).toBe('2026-08-03T13:00:00.000Z');
      slots.forEach((s) => expect(s.available).toBe(true));
    });

    it('should handle multiple schedule windows on the same day', async () => {
      // Monday: 09:00-11:00 (4 slots) + 14:00-16:00 (4 slots) = 8 total
      await setupDisponibilidad(TENANT_A_ID, {
        dailySchedule: [
          { day: 1, start: '09:00', end: '11:00' },
          { day: 1, start: '14:00', end: '16:00' },
        ],
      });

      const date = new Date('2026-08-03T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);

      expect(slots.length).toBe(8);
      expect(slots[0].start.toISOString()).toBe('2026-08-03T09:00:00.000Z');
      expect(slots[3].start.toISOString()).toBe('2026-08-03T10:30:00.000Z');
      // Second window starts at index 4
      expect(slots[4].start.toISOString()).toBe('2026-08-03T14:00:00.000Z');
    });

    it('should return empty for an unconfigured day', async () => {
      // Saturday 2026-08-08 (getUTCDay() === 6) — not in schedule
      await setupDisponibilidad(TENANT_A_ID);

      const date = new Date('2026-08-08T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);
      expect(slots).toEqual([]);
    });

    it('should return empty when no disponibilidad config exists', async () => {
      const date = new Date('2026-08-03T00:00:00Z');
      const slots = await provider.getSlots(TENANT_B_ID, date);
      expect(slots).toEqual([]);
    });

    it('should return empty for a blocked date', async () => {
      // Wednesday 2026-08-05 is configured but blocked
      await setupDisponibilidad(TENANT_A_ID, {
        dailySchedule: [{ day: 3, start: '09:00', end: '12:00' }],
        blockedDates: ['2026-08-05'],
      });

      const date = new Date('2026-08-05T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);
      expect(slots).toEqual([]);
    });

    it('should respect minNotice by returning empty for dates within the window', async () => {
      // Set minNotice so high that no date can satisfy it
      await setupDisponibilidad(TENANT_A_ID, {
        minNotice: 9_999_999,
      });

      const date = new Date('2026-08-03T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);
      expect(slots).toEqual([]);
    });

    it('should mark slots as unavailable when overlapping with existing bookings', async () => {
      await setupDisponibilidad(TENANT_A_ID, {
        dailySchedule: [{ day: 1, start: '09:00', end: '11:00' }],
      });

      // Create an existing booking at 09:30-10:00 on Monday
      await prisma.admin.cita.create({
        data: {
          tenantId: TENANT_A_ID,
          fecha: new Date('2026-08-03T09:30:00Z'),
          duracion: 30,
          estado: 'confirmada',
          titulo: 'Existing cita',
        },
      });

      const date = new Date('2026-08-03T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);

      // 09:00-11:00 = 4 slots of 30min
      expect(slots.length).toBe(4);
      // 09:30 slot should be unavailable
      const bookedSlot = slots.find(
        (s) => s.start.toISOString() === '2026-08-03T09:30:00.000Z',
      );
      expect(bookedSlot).toBeDefined();
      expect(bookedSlot!.available).toBe(false);

      // Adjacent slots should still be available
      const beforeSlot = slots.find(
        (s) => s.start.toISOString() === '2026-08-03T09:00:00.000Z',
      );
      expect(beforeSlot!.available).toBe(true);
    });

    it('should not expose citas from other tenants', async () => {
      await setupDisponibilidad(TENANT_A_ID, {
        dailySchedule: [{ day: 1, start: '09:00', end: '11:00' }],
      });

      // Create a booking for tenant B at 09:30
      await prisma.admin.cita.create({
        data: {
          tenantId: TENANT_B_ID,
          fecha: new Date('2026-08-03T09:30:00Z'),
          duracion: 30,
          estado: 'confirmada',
          titulo: 'Tenant B cita',
        },
      });

      // Tenant A's slots should NOT be affected by tenant B's booking
      const date = new Date('2026-08-03T00:00:00Z');
      const slots = await provider.getSlots(TENANT_A_ID, date);

      expect(slots.length).toBe(4);
      slots.forEach((s) => expect(s.available).toBe(true));
    });
  });

  // ───── bookSlot ───────────────────────────────────────────────

  describe('bookSlot', () => {
    it('should book an available slot successfully', async () => {
      await setupDisponibilidad(TENANT_A_ID);

      const cita = await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:00:00Z'),
        duracion: 30,
        clienteNombre: 'Juan Perez',
        clienteEmail: 'juan@example.com',
        clienteTelefono: '+34600000000',
      });

      expect(cita).toBeDefined();
      expect(cita.tenantId).toBe(TENANT_A_ID);
      expect(cita.fecha).toEqual(new Date('2026-09-01T10:00:00Z'));
      expect(cita.duracion).toBe(30);
      expect(cita.estado).toBe('pendiente');
      expect(cita.clienteNombre).toBe('Juan Perez');
      expect(cita.clienteEmail).toBe('juan@example.com');
      expect(cita.clienteTelefono).toBe('+34600000000');

      // Verify it's persisted
      const persisted = await prisma.admin.cita.findUnique({
        where: { id: cita.id },
      });
      expect(persisted).not.toBeNull();
    });

    it('should reject double-booking on the exact same slot', async () => {
      await setupDisponibilidad(TENANT_A_ID);

      // First booking succeeds
      await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:00:00Z'),
        duracion: 30,
      });

      // Second booking on the exact same slot must fail
      await expect(
        provider.bookSlot(TENANT_A_ID, {
          fecha: new Date('2026-09-01T10:00:00Z'),
          duracion: 30,
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        provider.bookSlot(TENANT_A_ID, {
          fecha: new Date('2026-09-01T10:00:00Z'),
          duracion: 30,
        }),
      ).rejects.toThrow('Slot no disponible');
    });

    it('should reject double-booking on partially overlapping slot', async () => {
      await setupDisponibilidad(TENANT_A_ID);

      // Book 10:00-10:30
      await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:00:00Z'),
        duracion: 30,
      });

      // Try to book 10:15-10:45 — overlaps with 10:00-10:30
      await expect(
        provider.bookSlot(TENANT_A_ID, {
          fecha: new Date('2026-09-01T10:15:00Z'),
          duracion: 30,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow booking adjacent non-overlapping slots', async () => {
      await setupDisponibilidad(TENANT_A_ID);

      // Book 10:00-10:30
      await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:00:00Z'),
        duracion: 30,
      });

      // Book 10:30-11:00 — adjacent, no conflict
      const second = await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:30:00Z'),
        duracion: 30,
      });

      expect(second).toBeDefined();
      expect(second.estado).toBe('pendiente');
    });
  });

  // ───── confirmCita / cancelCita ───────────────────────────────

  describe('confirmCita', () => {
    it('should change estado to confirmada', async () => {
      await setupDisponibilidad(TENANT_A_ID);

      const cita = await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:00:00Z'),
        duracion: 30,
      });

      const confirmed = await provider.confirmCita(cita.id);
      expect(confirmed.estado).toBe('confirmada');
    });
  });

  describe('cancelCita', () => {
    it('should change estado to cancelada', async () => {
      await setupDisponibilidad(TENANT_A_ID);

      const cita = await provider.bookSlot(TENANT_A_ID, {
        fecha: new Date('2026-09-01T10:00:00Z'),
        duracion: 30,
      });

      const cancelled = await provider.cancelCita(cita.id);
      expect(cancelled.estado).toBe('cancelada');
    });
  });
});
