'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SearchResponse, SearchGroup } from '@/lib/api-types';

interface UseSearchReturn {
  query: string;
  results: SearchGroup[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  setQuery: (q: string) => void;
  clear: () => void;
}

export function useSearch(minQueryLength = 2): UseSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < minQueryLength) {
      setResults([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setIsError(false);

    try {
      const res = await api.get<SearchResponse>('/api/v1/search', { q }, { auth: true });
      setResults(res.groups ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setIsError(true);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setIsLoading(false);
    setIsError(false);
  }, []);

  return { query, results, total, isLoading, isError, setQuery, clear };
}
