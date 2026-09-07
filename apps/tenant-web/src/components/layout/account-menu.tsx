'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUser, logout, redirectToLogin } from '@/lib/auth';

type AccountIdentity = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type SessionResponse = {
  user?: AccountIdentity | null;
};

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeIdentity(response: SessionResponse): AccountIdentity {
  const user = response?.user;
  const name = nonEmpty(user?.name);
  const email = nonEmpty(user?.email);
  const role = nonEmpty(user?.role);

  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(role ? { role: role.toLowerCase() === 'admin' ? 'Administrador' : role } : {}),
  };
}

export function AccountMenu() {
  const [identity, setIdentity] = useState<AccountIdentity>({});
  const [open, setOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;

    void getCurrentUser()
      .then((user) => {
        if (active) setIdentity(normalizeIdentity({ user }));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleLogout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await logout();
    } catch {
      // Local sign-out is still required when the remote request fails.
    } finally {
      for (const storage of [window.sessionStorage, window.localStorage]) {
        storage.removeItem('crm_session_token');
        storage.removeItem('crm_user');
        storage.removeItem('crm_client_name');
      }
      redirectToLogin();
    }
  };

  const initials = identity.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Cuenta de usuario"
        aria-expanded={open}
        aria-controls="account-menu-popover"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DAE2FD] text-xs font-semibold text-[#0F172A] hover:bg-[#C7D2FE]"
      >
        {initials || 'U'}
      </button>

      {open && (
        <div
          id="account-menu-popover"
          role="dialog"
          aria-label="Opciones de cuenta"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-[0.5rem] border border-[#E2E8F0] bg-white p-2 shadow-lg"
        >
          {(identity.name || identity.email || identity.role) && (
            <div className="border-b border-[#E2E8F0] px-3 py-2">
              {identity.name && <p className="truncate text-sm font-medium text-[#1B1B1D]">{identity.name}</p>}
              {identity.email && <p className="truncate text-xs text-[#45464D]">{identity.email}</p>}
              {identity.role && <p className="text-xs text-[#45464D]">{identity.role}</p>}
            </div>
          )}
          <Link
            href="/admin/perfil"
            onClick={() => setOpen(false)}
            className="block rounded-[0.25rem] px-3 py-2 text-sm text-[#45464D] hover:bg-[#F0EDEF]"
          >
            Perfil
          </Link>
          <button
            type="button"
            disabled={logoutPending}
            onClick={() => void handleLogout()}
            className="w-full rounded-[0.25rem] px-3 py-2 text-left text-sm text-[#45464D] hover:bg-[#F0EDEF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
