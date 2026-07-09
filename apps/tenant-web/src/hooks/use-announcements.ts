import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

export interface Announcement {
  id: string;
  message: string;
  createdAt: string;
  expiresAt?: string;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const fetchIdRef = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++fetchIdRef.current;
    try {
      const result = await api.get<Announcement[]>('/api/v1/admin-tools/announcements', undefined, { auth: true });
      if (id === fetchIdRef.current) setAnnouncements(result);
    } catch {
      if (id === fetchIdRef.current) setAnnouncements([]);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { announcements, refetch: fetch };
}
