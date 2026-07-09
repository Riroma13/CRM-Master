'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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
      const user = await login(email, password);
      // Pre-load tenant info for sidebar
      try { sessionStorage.setItem('crm_tenant_name', user.tenant.name); } catch {}
      router.push('/admin');
    } catch (err: any) {
      const msg = err?.message || '';
      // Try to check if the user exists at all
      let extraInfo = '';
      try {
        const check = await fetch('/api/v1/auth/check-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (check.ok) {
          const data = await check.json();
          if (!data.exists) extraInfo = ' — El email no está registrado';
        }
      } catch {}
      setError(`${msg}${extraInfo}`);
    } finally {
      setLoading(false);
    }
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

        {error && (
          <div className="mb-4 rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3">
            <p className="text-[13px] text-[#EF4444]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ejemplo.com"
              className="mt-1"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
              Contraseña
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2 bg-[#131B2E] text-xs text-white"
            disabled={loading}
          >
            <LogIn className="h-3.5 w-3.5" />
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-[#45464D]">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-[#131B2E] font-medium hover:underline">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
