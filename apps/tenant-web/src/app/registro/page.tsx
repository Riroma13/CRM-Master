'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, CheckCircle } from 'lucide-react';

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/client/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          nombre: nombre.trim(),
          businessName: businessName.trim() || undefined,
        }),
      });

      if (res.status === 409) {
        setError('Este email ya está registrado');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al registrarse');
      }

      setSuccess(true);
      setTimeout(() => router.push('/login?registered=true'), 1500);
    } catch (err: any) {
      setError(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#D1FAE5]">
            <CheckCircle className="h-6 w-6 text-[#10B981]" />
          </div>
          <h1 className="text-[18px] font-semibold text-[#1B1B1D]">Cuenta creada</h1>
          <p className="mt-2 text-[13px] text-[#45464D]">
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="w-full max-w-sm rounded-[0.5rem] border border-[#E2E8F0] bg-white p-8 shadow-ambient">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[0.375rem] bg-[#0F172A]">
            <span className="text-sm font-bold text-white">C</span>
          </div>
          <h1 className="text-[18px] font-semibold text-[#1B1B1D]">Crear cuenta</h1>
          <p className="mt-1 text-[13px] text-[#45464D]">Comienza con tu propio portal</p>
        </div>

        {error && (
          <div className="mb-4 rounded-[0.25rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-3">
            <p className="text-[13px] text-[#EF4444]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Tu nombre *</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan García" className="mt-1" required />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Email *</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="mt-1" required autoComplete="email" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Contraseña *</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required autoComplete="new-password" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Nombre del negocio</label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Mi Asesoría" className="mt-1" />
          </div>

          <Button type="submit" className="w-full gap-2 bg-[#131B2E] text-xs text-white" disabled={loading}>
            <UserPlus className="h-3.5 w-3.5" />
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-[#45464D]">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#131B2E] font-medium hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
