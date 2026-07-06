// ─── Error types ──────────────────────────────────────────────

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────

type Params = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: Params): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  const url = new URL(path, baseUrl || 'http://localhost');

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  if (!baseUrl) {
    const search = url.search;
    return `${path}${search}`;
  }

  return url.toString();
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = { message: response.statusText };
    }
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      body,
    );
  }

  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  const token = process.env.NEXT_PUBLIC_API_TOKEN;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── API client ───────────────────────────────────────────────

export const api = {
  async get<T>(path: string, params?: Params): Promise<T> {
    try {
      const url = buildUrl(path, params);
      const response = await fetch(url, { headers: getHeaders() });
      return handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Failed to fetch',
        error,
      );
    }
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    try {
      const url = buildUrl(path);
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      return handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : 'Failed to fetch',
        error,
      );
    }
  },
};

export type ApiGet = typeof api.get;
export type ApiPost = typeof api.post;
