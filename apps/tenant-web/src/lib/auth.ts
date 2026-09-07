'use client';

import { api } from './api';

const GOOGLE_RETURN_PATHS = new Set(['/admin', '/login']);

export function getGoogleLoginUrl(callbackPath: string = '/admin'): string {
  const safeCallbackPath = GOOGLE_RETURN_PATHS.has(callbackPath) ? callbackPath : '/admin';
  const params = new URLSearchParams({ provider: 'google', callbackURL: safeCallbackPath });
  return `/api/auth/sign-in/social?${params.toString()}`;
}

export function beginGoogleLogin(): void {
  if (typeof window === 'undefined') return;
  window.location.assign(getGoogleLoginUrl());
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tenant: { id: string; slug: string; name: string };
}

export interface AuthIdentity {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export async function getCurrentUser(): Promise<AuthIdentity> {
  return api.get<AuthIdentity>('/api/v1/auth/me');
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await api.post<AuthUser>('/api/v1/auth/login', { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post<void>('/api/v1/auth/logout', undefined, { auth: true });
}

export function redirectToLogin() {
  if (typeof window === 'undefined') return;
  window.location.href = '/login';
}
