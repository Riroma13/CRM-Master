import { ServiceUnavailableException } from '@nestjs/common';
import {
  buildClientesCsv,
  neutralizeCsvCell,
  parseClientesCsv,
  REQUIRED_CLIENTES_CSV_HEADERS,
} from '../import-export.service';

describe('ImportExportService CSV contract', () => {
  it('quotes RFC-4180 cells and neutralizes formula prefixes', () => {
    const csv = buildClientesCsv([
      {
        nombre: '=SUM(A1)',
        tipoNegocio: 'Retail, Norte',
        estadoRelacion: 'Activo',
        saludGeneral: '🟢',
        tags: ['a', 'b'],
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);

    expect(csv).toContain('"\'=SUM(A1)","Retail, Norte","Activo","🟢","a; b","2026-01-02"');
    expect(neutralizeCsvCell('+1')).toBe("'+1");
    expect(neutralizeCsvCell('normal')).toBe('normal');
  });

  it('accepts only the exact UTF-8 v1 header and RFC-4180 rows', () => {
    const input = `${REQUIRED_CLIENTES_CSV_HEADERS.join(',')}\r\n"Acme, S.A.","Retail","Activo","🟢","one; two","2026-01-02"\r\n`;
    expect(parseClientesCsv(Buffer.from(input, 'utf8'))).toEqual([
      {
        nombre: 'Acme, S.A.',
        tipoNegocio: 'Retail',
        estadoRelacion: 'Activo',
        saludGeneral: '🟢',
        tags: ['one', 'two'],
        created: '2026-01-02',
      },
    ]);
    expect(() =>
      parseClientesCsv(Buffer.from('nombre,tipo_negocio\r\nAcme,Retail\r\n', 'utf8')),
    ).toThrow('Invalid clientes-csv-v1 header');
  });

  it('fails closed when required audit persistence is unavailable', async () => {
    const service = new (require('../import-export.service').ImportExportService)(
      {
        forTenant: jest
          .fn()
          .mockReturnValue({ cliente: { findMany: jest.fn().mockResolvedValue([]) } }),
      },
      {},
      {
        requiredLog: jest
          .fn()
          .mockRejectedValue(new ServiceUnavailableException('EXPORT_AUDIT_UNAVAILABLE')),
      },
    );
    const response = { setHeader: jest.fn(), send: jest.fn() };
    await expect(
      service.exportClientesCsv('tenant-a', 'actor-a', 'org-a', response),
    ).rejects.toMatchObject({
      status: 503,
    });
    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
  });

  it('rejects malformed RFC-4180 cells with trailing content after a closing quote', () => {
    const input = `${REQUIRED_CLIENTES_CSV_HEADERS.join(',')}\r\n"Acme"x,Retail,Activo,🟢,,2026-01-02\r\n`;
    expect(() => parseClientesCsv(Buffer.from(input, 'utf8'))).toThrow(
      'Invalid RFC-4180 quoted field',
    );
  });
});
