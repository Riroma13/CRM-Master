import { CreateEventoSchema, EventoListQuery } from '../dto';

describe('CreateEventoSchema', () => {
  const validPayload = {
    sistemaId: '550e8400-e29b-41d4-a716-446655440000',
    tipo: 'Decisión',
    titulo: 'Migrar a PostgreSQL 16',
    descripcion: 'Se acordó migrar la base de datos',
    siguienteAccion: 'Programar ventana de mantenimiento',
  };

  it('accepts valid payload with all fields', () => {
    const result = CreateEventoSchema.parse(validPayload);
    expect(result).toEqual(validPayload);
  });

  it('accepts valid payload with only required fields', () => {
    const result = CreateEventoSchema.parse({
      sistemaId: validPayload.sistemaId,
      tipo: 'Decisión',
      titulo: 'Migración',
    });
    expect(result).toEqual({
      sistemaId: validPayload.sistemaId,
      tipo: 'Decisión',
      titulo: 'Migración',
    });
  });

  it('accepts all valid tipo values', () => {
    const tipos = [
      'Decisión',
      'Cambio técnico',
      'Incidencia',
      'Reunión',
      'Aprendizaje',
    ];
    for (const tipo of tipos) {
      const result = CreateEventoSchema.parse({
        sistemaId: validPayload.sistemaId,
        tipo,
        titulo: 'Test',
      });
      expect(result.tipo).toBe(tipo);
    }
  });

  it('rejects empty titulo', () => {
    expect(() =>
      CreateEventoSchema.parse({
        sistemaId: validPayload.sistemaId,
        tipo: 'Decisión',
        titulo: '',
      }),
    ).toThrow();
  });

  it('rejects titulo shorter than 2 characters', () => {
    expect(() =>
      CreateEventoSchema.parse({
        sistemaId: validPayload.sistemaId,
        tipo: 'Decisión',
        titulo: 'A',
      }),
    ).toThrow();
  });

  it('rejects missing sistemaId', () => {
    expect(() =>
      CreateEventoSchema.parse({
        tipo: 'Decisión',
        titulo: 'Test',
      }),
    ).toThrow();
  });

  it('rejects invalid sistemaId (non-uuid)', () => {
    expect(() =>
      CreateEventoSchema.parse({
        sistemaId: 'not-a-uuid',
        tipo: 'Decisión',
        titulo: 'Test',
      }),
    ).toThrow();
  });

  it('rejects invalid tipo value', () => {
    expect(() =>
      CreateEventoSchema.parse({
        sistemaId: validPayload.sistemaId,
        tipo: 'InvalidType',
        titulo: 'Test',
      }),
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() => CreateEventoSchema.parse({})).toThrow();
  });
});

describe('EventoListQuery', () => {
  it('provides default page and limit', () => {
    const result = EventoListQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts custom page and limit', () => {
    const result = EventoListQuery.parse({ page: '2', limit: '50' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('rejects page less than 1', () => {
    expect(() => EventoListQuery.parse({ page: '0' })).toThrow();
  });

  it('rejects limit greater than 100', () => {
    expect(() => EventoListQuery.parse({ limit: '200' })).toThrow();
  });

  it('accepts optional tipo filter', () => {
    const result = EventoListQuery.parse({ tipo: 'Incidencia' });
    expect(result.tipo).toBe('Incidencia');
  });

  it('rejects invalid tipo filter', () => {
    expect(() => EventoListQuery.parse({ tipo: 'Invalid' })).toThrow();
  });
});
