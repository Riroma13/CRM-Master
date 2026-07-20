import { JsonExporter } from '../export/json-exporter';

describe('JsonExporter', () => {
  const exporter = new JsonExporter();

  it('has format json', () => {
    expect(exporter.format).toBe('json');
  });

  it('has content-type application/json', () => {
    expect(exporter.contentType).toBe('application/json');
  });

  it('exports object as JSON buffer', async () => {
    const data = { name: 'test', value: 42 };
    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'json',
    });

    const parsed = JSON.parse(result.toString('utf-8'));
    expect(parsed).toEqual({ name: 'test', value: 42 });
  });

  it('exports array as JSON buffer', async () => {
    const data = [{ a: 1 }, { a: 2 }];
    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'json',
    });

    const parsed = JSON.parse(result.toString('utf-8'));
    expect(parsed).toHaveLength(2);
  });

  it('exports null gracefully', async () => {
    const result = await exporter.export(null, {
      tenantId: 't1',
      userId: 'u1',
      format: 'json',
    });

    const parsed = JSON.parse(result.toString('utf-8'));
    expect(parsed).toBeNull();
  });

  it('produces pretty-printed JSON', async () => {
    const data = { a: 1 };
    const result = await exporter.export(data, {
      tenantId: 't1',
      userId: 'u1',
      format: 'json',
    });

    const str = result.toString('utf-8');
    expect(str).toContain('\n');
    expect(str).toContain('  ');
  });
});
