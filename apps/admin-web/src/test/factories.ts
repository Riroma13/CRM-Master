import type {
  ClienteDetail,
  EventoItem,
  TareaItem,
  PaginatedResponse,
} from '@/lib/api-types';

export const mockClienteId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
export const mockSistemaId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

export function createMockCliente(overrides?: Partial<ClienteDetail>): ClienteDetail {
  return {
    id: mockClienteId,
    nombre: 'Asesoría García',
    tipoNegocio: 'Asesoría Fiscal',
    contactoPrincipal: 'Juan García - juan@garcia.com',
    estadoRelacion: 'Activo',
    saludGeneral: '🟢',
    fechaInicio: '2024-06-01T00:00:00.000Z',
    notasGenerales: 'Cliente desde la época de BeeHive v1. Cliente referido por...',
    tags: ['factura mensual', 'VPS propio'],
    tenant: { id: 't-1', slug: 'asesoria-garcia', name: 'Asesoría García S.L.' },
    sistemas: [
      {
        id: mockSistemaId,
        nombreSistema: 'BeeHive producción',
        tipo: 'Gestor documental',
        entorno: 'Producción',
        version: '2.5.0',
        estadoTecnico: '🟢',
        fechaUltimoChequeo: '2026-06-30T00:00:00.000Z',
        items: [
          {
            id: 'item-1',
            categoria: 'Módulo funcional',
            nombre: 'Módulo de facturación',
            estado: 'Implementado',
            responsable: 'Ricardo',
          },
        ],
      },
    ],
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

export function createMockEventos(): PaginatedResponse<EventoItem> {
  return {
    data: [
      {
        id: 'e-1',
        fecha: '2026-06-30T10:00:00.000Z',
        tipo: 'Decisión',
        titulo: 'Migrar a PostgreSQL 16',
        descripcion: 'Se acordó migrar la base de datos',
        siguienteAccion: 'Programar ventana de mantenimiento',
        sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
      },
      {
        id: 'e-2',
        fecha: '2026-06-28T14:00:00.000Z',
        tipo: 'Incidencia',
        titulo: 'Error en módulo de reportes',
        descripcion: 'Se reportó un error al generar reportes mensuales',
        siguienteAccion: 'Revisar logs del servidor',
        sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
      },
    ],
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  };
}

export function createMockTareas(): PaginatedResponse<TareaItem> {
  return {
    data: [
      {
        id: 't-1',
        titulo: 'Revisar backup semanal',
        estado: 'Pendiente',
        prioridad: 'Media',
        fechaLimite: '2026-08-01T00:00:00.000Z',
        sistema: { id: mockSistemaId, nombreSistema: 'BeeHive producción' },
      },
      {
        id: 't-2',
        titulo: 'Actualizar certificado SSL',
        estado: 'Pendiente',
        prioridad: 'Alta',
        fechaLimite: null,
        sistema: null,
      },
    ],
    pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  };
}
