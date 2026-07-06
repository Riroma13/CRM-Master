import { UpdateClienteSchema, CreateClienteSchema, ClienteListQuery } from '../dto';

describe('UpdateClienteSchema — partial update', () => {
  it('accepts partial update with only nombre', () => {
    const result = UpdateClienteSchema.parse({ nombre: 'Nuevo Nombre' });
    expect(result.nombre).toBe('Nuevo Nombre');
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('accepts partial update with multiple fields', () => {
    const result = UpdateClienteSchema.parse({
      nombre: 'Actualizado',
      saludGeneral: '🟡',
      tags: ['tag1', 'tag2'],
    });
    expect(result.nombre).toBe('Actualizado');
    expect(result.saludGeneral).toBe('🟡');
    expect(result.tags).toEqual(['tag1', 'tag2']);
  });

  it('accepts empty object (no fields to update)', () => {
    const result = UpdateClienteSchema.parse({});
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(0);
  });

  it('rejects invalid saludGeneral value', () => {
    expect(() =>
      UpdateClienteSchema.parse({ saludGeneral: '🔵' }),
    ).toThrow();
  });

  it('rejects invalid estadoRelacion value', () => {
    expect(() =>
      UpdateClienteSchema.parse({ estadoRelacion: 'Desconocido' }),
    ).toThrow();
  });

  it('rejects nombre shorter than 2 characters', () => {
    expect(() => UpdateClienteSchema.parse({ nombre: 'A' })).toThrow();
  });

  it('rejects invalid tags (non-array)', () => {
    expect(() => UpdateClienteSchema.parse({ tags: 'not-an-array' })).toThrow();
  });
});

describe('CreateClienteSchema', () => {
  const validPayload = {
    nombre: 'Nuevo Cliente',
    tipoNegocio: 'Consultoría',
  };

  it('accepts valid payload', () => {
    const result = CreateClienteSchema.parse(validPayload);
    expect(result.nombre).toBe('Nuevo Cliente');
  });

  it('assigns default values for estadoRelacion, saludGeneral, tags', () => {
    const result = CreateClienteSchema.parse({ nombre: 'Test' });
    expect(result.estadoRelacion).toBe('Activo');
    expect(result.saludGeneral).toBe('🟢');
    expect(result.tags).toEqual([]);
  });
});

describe('ClienteListQuery', () => {
  it('provides default page and limit', () => {
    const result = ClienteListQuery.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts all optional filters', () => {
    const result = ClienteListQuery.parse({
      search: 'García',
      salud: '🟢',
      estado: 'Activo',
      tag: 'VPS',
    });
    expect(result.search).toBe('García');
    expect(result.salud).toBe('🟢');
    expect(result.estado).toBe('Activo');
    expect(result.tag).toBe('VPS');
  });
});
