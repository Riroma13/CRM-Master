'use client';

import { api } from './api';

const TOKEN_KEY = 'crm_session_token';
const USER_KEY = 'crm_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenant: { id: string; slug: string; name: string };
  session: { token: string; expiresAt: string };
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(user: AuthUser) {
  sessionStorage.setItem(TOKEN_KEY, user.session.token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  // Also store in localStorage for Playwright test persistence
  try { localStorage.setItem(TOKEN_KEY, user.session.token); } catch {}
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await api.post<AuthUser>('/api/v1/auth/login', { email, password });
  storeAuth(data);
  return data;
}

export function redirectToLogin() {
  if (typeof window === 'undefined') return;
  clearAuth();
  window.location.href = '/login';
}
