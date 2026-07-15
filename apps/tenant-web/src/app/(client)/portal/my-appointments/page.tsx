import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

async function getClientAppointments() {
  const cookieStore = await cookies();
  const clientCookie = cookieStore.get('__Secure-client-session');
  if (!clientCookie?.value) return null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/client/appointments`, {
      headers: { Cookie: `__Secure-client-session=${clientCookie.value}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function MyAppointmentsPage() {
  const cookieStore = await cookies();
  const clientCookie = cookieStore.get('__Secure-client-session');
  if (!clientCookie?.value) redirect('/login');

  const appointments = await getClientAppointments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B1B1D]">Mis Citas</h1>
        <p className="mt-1 text-sm text-[#45464D]">Consultá y gestioná tus citas agendadas</p>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Calendar className="h-8 w-8 text-[#94A3B8]" />
            <p className="text-sm text-[#94A3B8]">No tenés citas agendadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt: any) => (
            <Card key={appt.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-medium text-[#1B1B1D]">
                    {new Date(appt.fechaHora || appt.fecha).toLocaleDateString('es-AR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-[#94A3B8]">{appt.descripcion || appt.motivo || 'Sin descripción'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  appt.estado === 'CONFIRMADA' ? 'bg-[#D1FAE5] text-[#10B981]' :
                  appt.estado === 'CANCELADA' ? 'bg-[#FEF2F2] text-[#EF4444]' :
                  'bg-[#FEF9C3] text-[#CA8A04]'
                }`}>
                  {appt.estado || 'PENDIENTE'}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
