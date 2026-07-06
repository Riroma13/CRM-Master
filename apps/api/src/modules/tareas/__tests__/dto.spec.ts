import { CreateTareaRapidaSchema, TareaListQuery } from '../dto';

describe('CreateTareaRapidaSchema', () => {
  const validPayload = {
    titulo: 'Revisar backup semanal',
    prioridad: 'Alta',
    sistemaId: '550e8400-e29b-41d4-a716-446655440000',
    fechaLimite: '2026-08-01T00:00:00Z',
  };

  it('accepts valid payload with all fields', () => {
    const result = CreateTareaRapidaSchema.parse(validPayload);
    expect(result).toEqual(validPayload);
  });

  it('assigns default priority "Media" when not provided', () => {
    const result = CreateTareaRapidaSchema.parse({
      titulo: 'Tarea sin prioridad',
    });
    expect(result.prioridad).toBe('Media');
  });

  it('accepts priority "Baja" explicitly', () => {
    const result = CreateTareaRapidaSchema.parse({
      titulo: 'Tarea baja',
      prioridad: 'Baja',
    });
    expect(result.prioridad).toBe('Baja');
  });

  it('accepts priority "Alta" explicitly', () => {
    const result = CreateTareaRapidaSchema.parse({
      titulo: 'Tarea alta',
      prioridad: 'Alta',
    });
    expect(result.prioridad).toBe('Alta');
  });

  it('rejects empty titulo', () => {
    expect(() =>
      CreateTareaRapidaSchema.parse({
        titulo: '',
      }),
    ).toThrow();
  });

  it('rejects titulo shorter than 2 characters', () => {
    expect(() =>
      CreateTareaRapidaSchema.parse({
        titulo: 'A',
      }),
    ).toThrow();
  });

  it('rejects invalid priority value', () => {
    expect(() =>
      CreateTareaRapidaSchema.parse({
        titulo: 'Test',
        prioridad: 'Urgente',
      }),
    ).toThrow();
  });

  it('rejects invalid sistemaId (non-uuid)', () => {
    expect(() =>
      CreateTareaRapidaSchema.parse({
        titulo: 'Test',
        sistemaId: 'not-uuid',
      }),
    ).toThrow();
  });

  it('accepts sistemaId as optional', () => {
    const result = CreateTareaRapidaSchema.parse({
      titulo: 'Tarea sin sistema',
    });
    expect(result.sistemaId).toBeUndefined();
  });

  it('rejects invalid fechaLimite format', () => {
    expect(() =>
      CreateTareaRapidaSchema.parse({
        titulo: 'Test',
        fechaLimite: '2026-08-01',
      }),
    ).toThrow();
  });

  it('accepts fechaLimite as optional', () => {
    const result = CreateTareaRapidaSchema.parse({
      titulo: 'Tarea sin fecha',
    });
    expect(result.fechaLimite).toBeUndefined();
  });

  it('rejects missing titulo', () => {
    expect(() => CreateTareaRapidaSchema.parse({})).toThrow();
  });
});

describe('TareaListQuery', () => {
  it('provides default page and limit', () => {
    const result = TareaListQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts custom page and limit', () => {
    const result = TareaListQuery.parse({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
  });

  it('rejects limit greater than 100', () => {
    expect(() => TareaListQuery.parse({ limit: '101' })).toThrow();
  });

  it('accepts optional estado filter', () => {
    const result = TareaListQuery.parse({ estado: 'Pendiente' });
    expect(result.estado).toBe('Pendiente');
  });

  it('accepts all valid estado values', () => {
    const estados = ['Pendiente', 'En curso', 'Hecho'];
    for (const estado of estados) {
      const result = TareaListQuery.parse({ estado });
      expect(result.estado).toBe(estado);
    }
  });

  it('rejects invalid estado value', () => {
    expect(() => TareaListQuery.parse({ estado: 'Cancelado' })).toThrow();
  });
});
