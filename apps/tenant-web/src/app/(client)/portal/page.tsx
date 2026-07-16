import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@crm-master/ui';
import { Calendar, FileText, User } from 'lucide-react';

async function getClientDashboard() {
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

export default async function PortalDashboard() {
  const session = await getClientDashboard();
  if (!session) {
    redirect('/login');
  }

  const { clientUser, cliente } = session;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B1B1D]">
          Bienvenido, {cliente?.nombre || clientUser?.email || 'Usuario'}
        </h1>
        <p className="mt-1 text-sm text-[#45464D]">
          Panel de control del cliente
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#45464D]">Próximas citas</CardTitle>
            <Calendar className="h-4 w-4 text-[#94A3B8]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-[#94A3B8]">Cargando desde el servidor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#45464D]">Documentos recientes</CardTitle>
            <FileText className="h-4 w-4 text-[#94A3B8]" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-[#94A3B8]">Cargando desde el servidor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#45464D]">Mi Perfil</CardTitle>
            <User className="h-4 w-4 text-[#94A3B8]" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#45464D] truncate">{cliente?.email || clientUser?.email}</p>
            <p className="text-xs text-[#94A3B8]">Email registrado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
