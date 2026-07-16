import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'CRM-Master | Portal del Cliente',
  description: 'Portal de autogestión para clientes',
};

async function getClientSession() {
  const cookieStore = await cookies();
  const clientCookie = cookieStore.get('__Secure-client-session');
  if (!clientCookie?.value) return null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/client/me`, {
      headers: { Cookie: `__Secure-client-session=${clientCookie.value}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_CLIENT_PORTAL_ENABLED !== 'true') {
    redirect('/login');
  }

  const session = await getClientSession();
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {children}
    </div>
  );
}
