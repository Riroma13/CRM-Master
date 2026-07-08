'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { DocumentDto, ShareLinkDto } from '@/lib/api-types';

interface UseDocumentosReturn {
  documentos: DocumentDto[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  uploadDocumento: (file: File, category: string, description?: string) => Promise<DocumentDto>;
  deleteDocumento: (id: string) => Promise<void>;
  createShareLink: (documentoId: string, expiresIn: string, maxDownloads?: number) => Promise<ShareLinkDto>;
}

export function useDocumentos(): UseDocumentosReturn {
  const [documentos, setDocumentos] = useState<DocumentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchIdRef = useRef(0);

  const fetchDocumentos = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<DocumentDto[]>(
        '/api/v1/tenant/documentos',
        undefined,
        { auth: true },
      );
      if (id === fetchIdRef.current) {
        setDocumentos(result);
      }
    } catch (err) {
      if (id === fetchIdRef.current) {
        setIsError(true);
        setError(err instanceof Error ? err : new Error('Error al cargar documentos'));
        setDocumentos([]);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  const refetch = useCallback(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  const uploadDocumento = useCallback(
    async (file: File, category: string, description?: string): Promise<DocumentDto> => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
      const url = baseUrl
        ? `${baseUrl}/api/v1/tenant/documentos`
        : '/api/v1/tenant/documentos';

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = { message: response.statusText };
        }
        throw new Error(
          (body as { message?: string })?.message ?? 'Error al subir documento',
        );
      }

      const doc = (await response.json()) as DocumentDto;

      // Optimistic update
      setDocumentos((prev) => [doc, ...prev]);

      return doc;
    },
    [],
  );

  const deleteDocumento = useCallback(
    async (id: string) => {
      await api.patch<DocumentDto>(
        `/api/v1/tenant/documentos/${id}`,
        { isDeleted: true },
        { auth: true },
      );

      // Optimistic update
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    },
    [],
  );

  const createShareLink = useCallback(
    async (
      documentoId: string,
      expiresIn: string,
      maxDownloads?: number,
    ): Promise<ShareLinkDto> => {
      const link = await api.post<ShareLinkDto>(
        `/api/v1/tenant/documentos/${documentoId}/share`,
        { expiresIn, maxDownloads },
        { auth: true },
      );

      // Update the documento's shareLinks optimistically
      setDocumentos((prev) =>
        prev.map((d) =>
          d.id === documentoId
            ? { ...d, shareLinks: [...(d.shareLinks ?? []), link] }
            : d,
        ),
      );

      return link;
    },
    [],
  );

  return {
    documentos,
    isLoading,
    isError,
    error,
    refetch,
    uploadDocumento,
    deleteDocumento,
    createShareLink,
  };
}
