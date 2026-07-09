import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="w-full max-w-sm rounded-[0.5rem] border border-[#E2E8F0] bg-white p-8 shadow-ambient text-center">
          <p className="text-[13px] text-[#45464D]">Cargando...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
