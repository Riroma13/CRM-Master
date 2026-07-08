import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Asesoría',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@demo.local' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.local',
      name: 'Admin Demo',
      role: 'admin',
      isActive: true,
    },
  });

  await prisma.disponibilidad.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      timezone: 'Europe/Madrid',
      slotDuration: 30,
      minNotice: 60,
      maxDays: 30,
      dailySchedule: [
        { day: 1, start: '09:00', end: '14:00' },
        { day: 1, start: '16:00', end: '19:00' },
        { day: 2, start: '09:00', end: '14:00' },
        { day: 3, start: '09:00', end: '14:00' },
        { day: 4, start: '09:00', end: '14:00' },
        { day: 5, start: '09:00', end: '14:00' },
      ],
      blockedDates: [],
    },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  await prisma.cita.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.cita.createMany({
    data: [
      {
        tenantId: tenant.id,
        fecha: tomorrow,
        duracion: 30,
        estado: 'pendiente',
        clienteNombre: 'Juan Pérez',
        clienteEmail: 'juan@demo.local',
        titulo: 'Consulta fiscal',
      },
      {
        tenantId: tenant.id,
        fecha: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        duracion: 30,
        estado: 'confirmada',
        clienteNombre: 'María López',
        clienteEmail: 'maria@demo.local',
        titulo: 'Revisión trimestral',
      },
    ],
  });

  console.log('Seed complete for tenant:', tenant.slug, tenant.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
