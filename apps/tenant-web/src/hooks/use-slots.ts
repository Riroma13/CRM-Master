import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Slot } from '@/lib/api-types';
import { generateMockSlots } from '@/lib/mock-data';

interface UseSlotsReturn {
  slots: Slot[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Stable string key for a Date — avoids infinite loops from Date object ref changes */
function dateToKey(date: Date | null): string | null {
  if (!date) return null;
  return formatDate(date);
}

export function useSlots(date: Date | null): UseSlotsReturn {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use a stable string key instead of the Date object reference
  const dateKey = useMemo(() => dateToKey(date), [date]);
  const dateKeyRef = useRef(dateKey);
  dateKeyRef.current = dateKey;

  const fetchSlots = useCallback(async (key: string) => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await api.get<Slot[]>(
        '/api/v1/tenant/calendario/slots',
        { fecha: key },
      );
      setSlots(result);
    } catch (err) {
      // Dev/demo: fall back to mock slots when API is unavailable
      setSlots(generateMockSlots(key));
      setIsError(false);
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dateKey) {
      setSlots([]);
      setIsLoading(false);
      return;
    }

    fetchSlots(dateKey);
  }, [dateKey, fetchSlots]);

  const refetch = useCallback(() => {
    if (dateKeyRef.current) {
      fetchSlots(dateKeyRef.current);
    }
  }, [fetchSlots]);

  return { slots, isLoading, isError, error, refetch };
}
