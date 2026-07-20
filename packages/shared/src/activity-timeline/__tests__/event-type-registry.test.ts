import { describe, it, expect } from 'vitest';
import { EventTypeRegistry } from '../event-type-registry';

describe('EventTypeRegistry', () => {
  it('register and get an event type', () => {
    const registry = new EventTypeRegistry();

    registry.register({
      eventType: 'cliente.creado',
      module: 'clientes',
      description: 'Se creó un nuevo cliente',
      category: 'crm',
      since: '2026-07-20',
    });

    const result = registry.get('cliente.creado');
    expect(result).toBeDefined();
    expect(result!.module).toBe('clientes');
  });

  it('throws on duplicate registration', () => {
    const registry = new EventTypeRegistry();
    const meta = {
      eventType: 'cliente.creado',
      module: 'clientes',
      description: 'test',
      category: 'crm',
      since: '2026-07-20',
    };

    registry.register(meta);
    expect(() => registry.register(meta)).toThrow('already registered');
  });

  it('getAll returns all registered types', () => {
    const registry = new EventTypeRegistry();

    registry.register({
      eventType: 'a',
      module: 'm1',
      description: 'd1',
      category: 'crm',
      since: '2026-01-01',
    });
    registry.register({
      eventType: 'b',
      module: 'm2',
      description: 'd2',
      category: 'auth',
      since: '2026-01-01',
    });

    expect(registry.getAll()).toHaveLength(2);
  });

  it('getByModule filters by module name', () => {
    const registry = new EventTypeRegistry();

    registry.register({
      eventType: 'a',
      module: 'clientes',
      description: 'd1',
      category: 'crm',
      since: '2026-01-01',
    });
    registry.register({
      eventType: 'b',
      module: 'auth',
      description: 'd2',
      category: 'auth',
      since: '2026-01-01',
    });
    registry.register({
      eventType: 'c',
      module: 'clientes',
      description: 'd3',
      category: 'crm',
      since: '2026-01-01',
    });

    const clientes = registry.getByModule('clientes');
    expect(clientes).toHaveLength(2);
    expect(clientes.map((m) => m.eventType)).toEqual(['a', 'c']);
  });

  it('getByModule returns empty array for unknown module', () => {
    const registry = new EventTypeRegistry();
    expect(registry.getByModule('nonexistent')).toEqual([]);
  });

  it('isRegistered returns true for registered types', () => {
    const registry = new EventTypeRegistry();

    registry.register({
      eventType: 'test.event',
      module: 'test',
      description: 'test',
      category: 'crm',
      since: '2026-01-01',
    });

    expect(registry.isRegistered('test.event')).toBe(true);
    expect(registry.isRegistered('unknown')).toBe(false);
  });

  it('get returns undefined for unregistered type', () => {
    const registry = new EventTypeRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('getAll returns empty array for fresh registry', () => {
    const registry = new EventTypeRegistry();
    expect(registry.getAll()).toEqual([]);
  });
});
