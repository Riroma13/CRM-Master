import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileEditForm } from './profile-edit-form';

async function getClientProfile() {
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

export default async function ProfilePage() {
  const session = await getClientProfile();
  if (!session) {
    redirect('/login');
  }

  const { cliente } = session;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B1B1D]">Mi Perfil</h1>
        <p className="mt-1 text-sm text-[#45464D]">Consultá y editá tus datos de contacto</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información personal</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm cliente={cliente} />
        </CardContent>
      </Card>
    </div>
  );
}
