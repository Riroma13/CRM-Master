import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError, NetworkError } from './api';

const BASE_URL = 'http://localhost:3000';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_API_URL', BASE_URL);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFetch(response: Partial<Response>) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
    ...response,
  });
}

describe('api.get()', () => {
  it('makes a GET request and returns parsed JSON', async () => {
    const data = { id: '1', name: 'test' };
    mockFetch({ json: vi.fn().mockResolvedValue(data) });

    const result = await api.get<typeof data>('/test');
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/test`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('appends query params', async () => {
    mockFetch({});
    await api.get('/test', { foo: 'bar', num: 42 });
    const callUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callUrl).toContain('foo=bar');
    expect(callUrl).toContain('num=42');
  });

  it('skips undefined/null/empty params', async () => {
    mockFetch({});
    await api.get('/test', { a: 'val', b: undefined, c: null, d: '' });
    const callUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callUrl).toContain('a=val');
    expect(callUrl).not.toContain('b=');
    expect(callUrl).not.toContain('c=');
    expect(callUrl).not.toContain('d=');
  });

  it('throws NetworkError on fetch failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    await expect(api.get('/test')).rejects.toThrow(NetworkError);
  });

  it('throws ApiError on non-ok response', async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ message: 'Not found' }),
    });
    await expect(api.get('/test')).rejects.toThrow(ApiError);
  });

  it('includes auth token when present', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_TOKEN', 'my-token');
    mockFetch({});

    await api.get('/test');
    const callInit = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(callInit.headers['Authorization']).toBe('Bearer my-token');
  });
});

describe('api.post()', () => {
  it('makes a POST request with JSON body', async () => {
    const body = { name: 'new' };
    const data = { id: '1', ...body };
    mockFetch({ json: vi.fn().mockResolvedValue(data) });

    const result = await api.post('/test', body);
    expect(result).toEqual(data);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/test`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      }),
    );
  });

  it('throws NetworkError on fetch failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    await expect(api.post('/test', {})).rejects.toThrow(NetworkError);
  });
});

describe('api.patch()', () => {
  it('makes a PATCH request with JSON body', async () => {
    const body = { estado: 'confirmada' };
    mockFetch({ json: vi.fn().mockResolvedValue(body) });

    const result = await api.patch('/test/1', body);
    expect(result).toEqual(body);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/test/1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    );
  });
});

describe('api.put()', () => {
  it('makes a PUT request with JSON body', async () => {
    const body = { dailySchedule: [] };
    mockFetch({ json: vi.fn().mockResolvedValue(body) });

    const result = await api.put('/config', body);
    expect(result).toEqual(body);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/config`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    );
  });
});
