'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirects to /login if no session token is found.
 */
export function AuthGuard() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = sessionStorage.getItem('crm_session_token') || localStorage.getItem('crm_session_token');
      if (!token) router.replace('/login');
    } catch {
      // sessionStorage unavailable — SSR/test
    }
  }, [router]);

  return null;
}
