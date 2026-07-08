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

interface RequestOpts {
  /** Send credentials: 'include' for session cookie auth (default: false). */
  auth?: boolean;
}

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

  // If no base URL was set, return just path + search
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

async function request<T>(
  method: string,
  path: string,
  params?: Params,
  body?: unknown,
  opts?: RequestOpts,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const url = buildUrl(path, params);

  const init: RequestInit = { method, headers };

  if (opts?.auth) {
    init.credentials = 'include';
  }

  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, init);
    return handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(
      error instanceof Error ? error.message : 'Failed to fetch',
      error,
    );
  }
}

// ─── API client ───────────────────────────────────────────────

export const api = {
  get<T>(path: string, params?: Params, opts?: RequestOpts): Promise<T> {
    return request<T>('GET', path, params, undefined, opts);
  },

  post<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return request<T>('POST', path, undefined, body, opts);
  },

  patch<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return request<T>('PATCH', path, undefined, body, opts);
  },

  put<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T> {
    return request<T>('PUT', path, undefined, body, opts);
  },

  delete<T>(path: string, opts?: RequestOpts): Promise<T> {
    return request<T>('DELETE', path, undefined, undefined, opts);
  },
};

// ─── Type helpers ─────────────────────────────────────────────

export type { RequestOpts };
export type ApiGet = typeof api.get;
export type ApiPost = typeof api.post;
export type ApiPatch = typeof api.patch;
export type ApiPut = typeof api.put;
