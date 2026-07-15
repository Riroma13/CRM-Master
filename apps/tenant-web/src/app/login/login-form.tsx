'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, UserCircle } from 'lucide-react';

function LoginFormTab({
  mode,
  onSuccess,
}: {
  mode: 'admin' | 'client';
  onSuccess: (redirectTo: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'admin') {
        const user = await login(email, password);
        try { sessionStorage.setItem('crm_tenant_name', user.tenant.name); } catch {}
        onSuccess('/admin');
      } else {
        const res = await fetch('/api/v1/client/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          throw new Error(res.status === 401 || res.status === 403
            ? 'Credenciales inválidas'
            : 'Error del servidor');
        }
        const data = await res.json();
        try { sessionStorage.setItem('crm_client_name', data.cliente?.nombre || ''); } catch {}
        onSuccess('/portal');
      }
    } catch (err: any) {
      setError(err?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={mode === 'admin' ? 'admin@ejemplo.com' : 'cliente@ejemplo.com'}
          className="mt-1"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Contraseña</label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="mt-1"
          required
          autoComplete={mode === 'admin' ? 'current-password' : 'off'}
        />
      </div>
      {error && (
        <div className="rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3">
          <p className="text-[13px] text-[#EF4444]">{error}</p>
        </div>
      )}
      <Button type="submit" className="w-full gap-2 bg-[#131B2E] text-xs text-white" disabled={loading}>
        <LogIn className="h-3.5 w-3.5" />
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registeredEmail = searchParams.get('registered') || '';
  const [registeredMsg] = useState(!!registeredEmail);
  const [tab, setTab] = useState('admin');

  const handleSuccess = (redirectTo: string) => {
    router.push(redirectTo);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-sm rounded-[0.5rem] border border-[#E2E8F0] bg-white p-8 shadow-ambient">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[0.375rem] bg-[#0F172A]">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <h1 className="text-[18px] font-semibold text-[#1B1B1D]">CRM-Master</h1>
          <p className="mt-1 text-[13px] text-[#45464D]">Portal del cliente</p>
        </div>

        {registeredMsg && (
          <div className="mb-4 rounded-[0.25rem] border border-[#D1FAE5]/30 bg-[#D1FAE5] p-3">
            <p className="text-[13px] text-[#10B981] font-medium">✓ Cuenta creada correctamente. Iniciá sesión con tu email y contraseña.</p>
          </div>
        )}

        <Tabs.Root value={tab} onValueChange={setTab} className="w-full">
          <Tabs.List className="mb-6 flex border-b border-[#E2E8F0]">
            <Tabs.Trigger
              value="admin"
              className={`flex flex-1 items-center justify-center gap-2 pb-3 text-[13px] font-medium transition-colors
                ${tab === 'admin' ? 'border-b-2 border-[#0F172A] text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
            >
              <UserCircle className="h-4 w-4" />
              Admin
            </Tabs.Trigger>
            <Tabs.Trigger
              value="client"
              className={`flex flex-1 items-center justify-center gap-2 pb-3 text-[13px] font-medium transition-colors
                ${tab === 'client' ? 'border-b-2 border-[#0F172A] text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#64748B]'}`}
            >
              <UserCircle className="h-4 w-4" />
              Cliente
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="admin">
            <LoginFormTab mode="admin" onSuccess={handleSuccess} />
          </Tabs.Content>

          <Tabs.Content value="client">
            <LoginFormTab mode="client" onSuccess={handleSuccess} />
          </Tabs.Content>
        </Tabs.Root>

        <p className="mt-4 text-center text-[13px] text-[#45464D]">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-[#131B2E] font-medium hover:underline">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
