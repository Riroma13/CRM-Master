import { CsvExporter } from '../export/csv-exporter';

describe('CsvExporter', () => {
  const exporter = new CsvExporter();

  it('has format csv', () => {
    expect(exporter.format).toBe('csv');
  });

  it('has content-type text/csv', () => {
    expect(exporter.contentType).toBe('text/csv');
  });

  it('exports array of objects as CSV with headers', async () => {
    const data = [
      { name: 'Alice', score: 100 },
      { name: 'Bob', score: 200 },
    ];

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[0]).toBe('name,score');
    expect(lines[1]).toBe('Alice,100');
    expect(lines[2]).toBe('Bob,200');
  });

  it('exports nested object rows', async () => {
    const data = {
      rows: [
        { city: 'NYC', count: 500 },
        { city: 'LA', count: 300 },
      ],
    };

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[0]).toBe('city,count');
    expect(lines[1]).toBe('NYC,500');
  });

  it('exports data.records array', async () => {
    const data = {
      records: [
        { product: 'A', revenue: 1000 },
        { product: 'B', revenue: 2000 },
      ],
    };

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[0]).toBe('product,revenue');
    expect(lines[1]).toBe('A,1000');
  });

  it('escapes fields containing commas', async () => {
    const data = [{ name: 'Smith, John', value: 1 }];

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[1]).toBe('"Smith, John",1');
  });

  it('escapes fields containing quotes', async () => {
    const data = [{ note: 'He said "hello"', id: 1 }];

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[1]).toBe('"He said ""hello""",1');
  });

  it('handles empty data', async () => {
    const result = await exporter.export([], {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    expect(result.toString('utf-8')).toBe('');
  });

  it('handles null values', async () => {
    const data = [{ name: 'Test', value: null }];

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[1]).toBe('Test,');
  });

  it('handles undefined values', async () => {
    const data = [{ name: 'Test', value: undefined }];

    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'csv',
    });

    const lines = result.toString('utf-8').split('\n');
    expect(lines[1]).toBe('Test,');
  });
});
