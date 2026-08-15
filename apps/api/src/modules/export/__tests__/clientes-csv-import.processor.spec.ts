import {
  CLIENTES_CSV_IMPORT_TARGET,
  CLIENTES_CSV_IMPORT_DEFINITION,
  DEFAULT_IMPORT_RETENTION,
  validateClienteCsvRows,
} from '../clientes-csv-import.definition';
import { ClientesCsvImportProcessor } from '../clientes-csv-import.processor';

describe('clientes-csv-v1 import contract', () => {
  it('registers one target with bounded removal policy', () => {
    expect(CLIENTES_CSV_IMPORT_TARGET).toBe('clientes-csv-v1');
    expect(CLIENTES_CSV_IMPORT_DEFINITION.key).toBe(CLIENTES_CSV_IMPORT_TARGET);
    expect(DEFAULT_IMPORT_RETENTION).toEqual({
      removeOnComplete: true,
      removeOnFail: { age: 86_400, count: 100 },
    });
  });

  it('rejects case-insensitive duplicate names before mutation', () => {
    expect(() =>
      validateClienteCsvRows([
        { nombre: 'Acme', estadoRelacion: 'Activo', saludGeneral: '🟢', tags: [] },
        { nombre: ' acme ', estadoRelacion: 'Activo', saludGeneral: '🟢', tags: [] },
      ]),
    ).toThrow('Duplicate nombre');
  });

  it('validates every row and rejects forged authority fields', () => {
    expect(() =>
      validateClienteCsvRows([
        { nombre: 'Valid', estadoRelacion: 'Activo', saludGeneral: '🟢', tags: [] },
        {
          nombre: '',
          estadoRelacion: 'Activo',
          saludGeneral: '🟢',
          tags: [],
          tenantId: 'other',
        } as never,
      ]),
    ).toThrow('Invalid cliente CSV row');
  });

  it('uses a serializable target-batch transaction and propagates write failure', async () => {
    const create = jest.fn().mockRejectedValue(new Error('write failed'));
    const transaction = jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>, options: unknown) => {
        expect(options).toMatchObject({ isolationLevel: expect.anything() });
        return callback({
          cliente: {
            findMany: jest.fn().mockResolvedValue([]),
            create,
          },
        });
      },
    );
    const processor = new ClientesCsvImportProcessor({
      assertActiveTenant: jest.fn().mockResolvedValue(undefined),
      forTenant: jest.fn().mockReturnValue({ $transaction: transaction }),
    } as never);

    await expect(
      processor.execute(
        {
          tenantId: 'tenant-a',
          actorId: 'actor-a',
          organizationId: 'org-a',
          idempotencyKey: 'import-1',
        },
        {
          target: 'clientes-csv-v1',
          actorId: 'actor-a',
          organizationId: 'org-a',
          rows: [{ nombre: 'Acme', estadoRelacion: 'Activo', saludGeneral: '🟢', tags: [] }],
        },
      ),
    ).rejects.toThrow('write failed');
    expect(create).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
