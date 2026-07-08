// ─── Mock data for development/demo — used when API is unavailable ───
// These are realistic sample datasets that make the UI visible during design
// review without a running backend. Replaced automatically once the API connects.

import type { CitaListResponse, DisponibilidadConfig } from './api-types';

export const MOCK_CITAS: CitaListResponse = {
  citas: [
    {
      id: 'mock-cita-pendiente-1',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() + 3600000).toISOString(),
      duracion: 30,
      estado: 'pendiente',
      titulo: 'Consulta fiscal',
      clienteNombre: 'Ana Martínez',
      clienteEmail: 'ana.martinez@example.com',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock-cita-pendiente-2',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() + 7200000).toISOString(),
      duracion: 45,
      estado: 'pendiente',
      titulo: 'Asesoría laboral',
      clienteNombre: 'Carlos Ruiz',
      clienteEmail: 'carlos.ruiz@example.com',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'mock-cita-pendiente-3',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() + 10800000).toISOString(),
      duracion: 30,
      estado: 'pendiente',
      titulo: 'Revisión trimestral',
      clienteNombre: 'Laura Sánchez',
      clienteEmail: 'laura@example.com',
      clienteTelefono: '612345678',
      descripcion: 'Revisar declaraciones del Q2',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: 'mock-cita-confirmada-1',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() + 86400000).toISOString(),
      duracion: 30,
      estado: 'confirmada',
      titulo: 'Revisión contable',
      clienteNombre: 'María García',
      clienteEmail: 'maria.garcia@example.com',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'mock-cita-pendiente-4',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() + 172800000).toISOString(),
      duracion: 60,
      estado: 'pendiente',
      titulo: 'Planificación patrimonial',
      clienteNombre: 'Pedro López',
      clienteEmail: 'pedro.lopez@example.com',
      clienteTelefono: '634567890',
      descripcion: 'Revisión de herencia y testamento',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: 'mock-cita-completada-1',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() - 86400000).toISOString(),
      duracion: 30,
      estado: 'completada',
      titulo: 'Firma documentos',
      clienteNombre: 'Javier Fernández',
      clienteEmail: 'javier@example.com',
      createdAt: new Date(Date.now() - 432000000).toISOString(),
      updatedAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'mock-cita-cancelada-1',
      tenantId: 'tenant-1',
      fecha: new Date(Date.now() - 172800000).toISOString(),
      duracion: 30,
      estado: 'cancelada',
      titulo: 'Consulta urgente',
      clienteNombre: 'Raquel Gómez',
      clienteEmail: 'raquel@example.com',
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ],
  total: 7,
};

export const MOCK_DISPONIBILIDAD: DisponibilidadConfig = {
  timezone: 'Europe/Madrid',
  slotDuration: 30,
  minNotice: 240,
  maxDays: 30,
  dailySchedule: [
    { day: 1, start: '09:00', end: '14:00' },
    { day: 1, start: '16:00', end: '19:00' },
    { day: 2, start: '09:00', end: '14:00' },
    { day: 2, start: '16:00', end: '19:00' },
    { day: 3, start: '09:00', end: '14:00' },
    { day: 4, start: '09:00', end: '14:00' },
    { day: 4, start: '16:00', end: '19:00' },
    { day: 5, start: '09:00', end: '14:00' },
  ],
  blockedDates: ['2026-08-15', '2026-10-12', '2026-12-25', '2027-01-01'],
};

export function generateMockSlots(dateKey: string) {
  const slots = [];
  const intervals = [
    { start: 9, end: 14 },
    { start: 16, end: 19 },
  ];

  for (const period of intervals) {
    for (let h = period.start; h < period.end; h++) {
      for (let m = 0; m < 60; m += 30) {
        const start = `${dateKey}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
        const endMin = m + 30;
        const endH = endMin >= 60 ? h + 1 : h;
        const endM = endMin >= 60 ? endMin - 60 : endMin;
        const end = `${dateKey}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000Z`;
        slots.push({ start, end, available: true });
      }
    }
  }

  // Mark some as unavailable to show disabled state
  if (slots.length > 4) {
    slots[2].available = false;
    slots[5].available = false;
    slots[8].available = false;
  }

  return slots;
}
