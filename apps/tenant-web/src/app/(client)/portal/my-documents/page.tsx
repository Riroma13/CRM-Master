import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@crm-master/ui';
import { FileText } from 'lucide-react';

async function getClientDocuments() {
  const cookieStore = await cookies();
  const clientCookie = cookieStore.get('__Secure-client-session');
  if (!clientCookie?.value) return null;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/client/documents`, {
      headers: { Cookie: `__Secure-client-session=${clientCookie.value}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function MyDocumentsPage() {
  const cookieStore = await cookies();
  const clientCookie = cookieStore.get('__Secure-client-session');
  if (!clientCookie?.value) redirect('/login');

  const documents = await getClientDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1B1B1D]">Mis Documentos</h1>
        <p className="mt-1 text-sm text-[#45464D]">Documentos compartidos con vos</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <FileText className="h-8 w-8 text-[#94A3B8]" />
            <p className="text-sm text-[#94A3B8]">No tenés documentos compartidos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <Card key={doc.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[#94A3B8]" />
                  <div>
                    <p className="text-sm font-medium text-[#1B1B1D]">{doc.nombre || doc.titulo || 'Documento'}</p>
                    <p className="text-xs text-[#94A3B8]">
                      {doc.tipo ? `${doc.tipo} — ` : ''}
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-AR') : ''}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
