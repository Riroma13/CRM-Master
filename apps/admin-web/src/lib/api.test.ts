import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError, NetworkError } from './api';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

function mockFetch(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 500 ? 'Internal Server Error' : 'OK',
    json: () => Promise.resolve(body),
  });
}

function mockFetchNetworkError() {
  global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
}

describe('api.get', () => {
  it('builds URL from path only when no base URL is set', async () => {
    process.env.NEXT_PUBLIC_API_URL = '';
    mockFetch(200, { data: [] });

    await api.get('/test');

    expect(global.fetch).toHaveBeenCalledWith('/test', expect.any(Object));
  });

  it('builds full URL when base URL is set', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    mockFetch(200, { data: [] });

    await api.get('/test');

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain('https://api.example.com/test');
  });

  it('appends query params to URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = '';
    mockFetch(200, { data: [] });

    await api.get('/test', { page: 1, limit: 20 });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('limit=20');
  });

  it('skips undefined and null params', async () => {
    process.env.NEXT_PUBLIC_API_URL = '';
    mockFetch(200, { data: [] });

    await api.get('/test', { search: undefined, tag: null, page: 1 });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).not.toContain('search');
    expect(calledUrl).not.toContain('tag');
  });

  it('skips empty string params', async () => {
    process.env.NEXT_PUBLIC_API_URL = '';
    mockFetch(200, { data: [] });

    await api.get('/test', { search: '' });

    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(calledUrl).not.toContain('search');
  });

  it('includes Authorization header when token is set', async () => {
    process.env.NEXT_PUBLIC_API_TOKEN = 'my-token';
    mockFetch(200, {});

    await api.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('omits Authorization header when token is not set', async () => {
    process.env.NEXT_PUBLIC_API_TOKEN = '';
    mockFetch(200, {});

    await api.get('/test');

    const opts = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('returns parsed JSON on 200', async () => {
    mockFetch(200, { metrics: { total: 10 } });

    const result = await api.get<{ metrics: { total: number } }>('/dashboard');

    expect(result).toEqual({ metrics: { total: 10 } });
  });

  it('throws ApiError on 401', async () => {
    mockFetch(401, { message: 'Unauthorized' });

    await expect(api.get('/dashboard')).rejects.toThrow(ApiError);
    await expect(api.get('/dashboard')).rejects.toThrow(
      'Request failed with status 401',
    );
  });

  it('throws ApiError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });

    await expect(api.get('/dashboard')).rejects.toThrow(ApiError);
    await expect(api.get('/dashboard')).rejects.toThrow(
      'Request failed with status 403',
    );
  });

  it('throws ApiError on 500 with parsed body', async () => {
    mockFetch(500, { error: 'Internal error' });

    try {
      await api.get('/dashboard');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      if (err instanceof ApiError) {
        expect(err.status).toBe(500);
        expect(err.body).toEqual({ error: 'Internal error' });
      }
    }
  });

  it('throws NetworkError on fetch failure', async () => {
    mockFetchNetworkError();

    await expect(api.get('/dashboard')).rejects.toThrow(NetworkError);
  });

  it('throws NetworkError with message from Error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Custom network error'));

    await expect(api.get('/dashboard')).rejects.toThrow(NetworkError);
    await expect(api.get('/dashboard')).rejects.toThrow('Custom network error');
  });
});
