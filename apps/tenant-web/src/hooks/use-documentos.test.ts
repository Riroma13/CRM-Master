import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDocumentos } from './use-documentos';
import { api } from '@/lib/api';
import type { DocumentDto, ShareLinkDto } from '@/lib/api-types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.body = body;
    }
  },
  NetworkError: class NetworkError extends Error {
    cause: unknown;
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'NetworkError';
      this.cause = cause;
    }
  },
}));

const mockDocumentos: DocumentDto[] = [
  {
    id: '1',
    filename: 'contrato-2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245760,
    category: 'contrato',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: '2',
    filename: 'factura-julio.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 102400,
    category: 'factura',
    description: 'Factura del mes de julio',
    createdAt: '2026-07-02T10:00:00Z',
  },
];

describe('useDocumentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDocumentos());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.documentos).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('fetches documentos with auth on mount', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDocumentos);

    const { result } = renderHook(() => useDocumentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(vi.mocked(api.get)).toHaveBeenCalledWith(
      '/api/v1/tenant/documentos',
      undefined,
      { auth: true },
    );
    expect(result.current.documentos).toEqual(mockDocumentos);
  });

  it('sets error state on fetch failure', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDocumentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeTruthy();
    expect(result.current.documentos).toEqual([]);
  });

  it('refetch reloads documentos', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDocumentos);

    const { result } = renderHook(() => useDocumentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);

    vi.mocked(api.get).mockResolvedValue([]);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2);
    expect(result.current.documentos).toEqual([]);
  });

  it('deleteDocumento calls PATCH and removes from list', async () => {
    vi.mocked(api.get).mockResolvedValue(mockDocumentos);
    vi.mocked(api.patch).mockResolvedValue({} as DocumentDto);

    const { result } = renderHook(() => useDocumentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteDocumento('1');
    });

    expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
      '/api/v1/tenant/documentos/1',
      { isDeleted: true },
      { auth: true },
    );
    expect(result.current.documentos).toHaveLength(1);
    expect(result.current.documentos[0].id).toBe('2');
  });

  it('createShareLink calls POST and updates document', async () => {
    const mockLink: ShareLinkDto = {
      id: 'link-1',
      token: 'shr_abc123',
      url: 'https://example.com/shared/shr_abc123',
      expiresAt: '2026-07-08T10:00:00Z',
      maxDownloads: 5,
      downloadCount: 0,
      createdAt: '2026-07-01T10:00:00Z',
    };

    vi.mocked(api.get).mockResolvedValue(mockDocumentos);
    vi.mocked(api.post).mockResolvedValue(mockLink);

    const { result } = renderHook(() => useDocumentos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      const link = await result.current.createShareLink('1', '7d', 5);
      expect(link).toEqual(mockLink);
    });

    expect(vi.mocked(api.post)).toHaveBeenCalledWith(
      '/api/v1/tenant/documentos/1/share',
      { expiresIn: '7d', maxDownloads: 5 },
      { auth: true },
    );

    // Check optimistic update added shareLinks
    const doc1 = result.current.documentos.find((d) => d.id === '1');
    expect(doc1?.shareLinks).toHaveLength(1);
    expect(doc1?.shareLinks?.[0].token).toBe('shr_abc123');
  });
});
