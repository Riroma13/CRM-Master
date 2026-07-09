import Link from 'next/link';
import { CheckCircle, Calendar, Users, FileText, ClipboardList, Bell } from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'Gestión de clientes', desc: 'Ficha completa con historial, documentos vinculados y estado de la relación.' },
  { icon: Calendar, title: 'Agenda de consultas', desc: 'Reserva online, recordatorios automáticos y gestión de horarios del despacho.' },
  { icon: FileText, title: 'Expedientes digitales', desc: 'Subida segura, descarga con link expirable y organización por cliente.' },
  { icon: ClipboardList, title: 'Seguimiento de casos', desc: 'Incidencias con prioridad, asignación y cierre — ideal para casos críticos.' },
  { icon: Bell, title: 'Recordatorios automáticos', desc: 'Email recordatorio al cliente 24h antes de cada consulta.' },
];

export default function FiscalLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-[#E2E8F0]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[0.375rem] bg-[#0F172A]">
              <span className="text-xs font-bold text-white">C</span>
            </div>
            <span className="text-[16px] font-semibold">CRM-Master</span>
          </div>
          <nav className="flex items-center gap-6 text-[14px] text-[#45464D]">
            <Link href="/fiscal" className="font-semibold text-[#0F172A]">Asesorías</Link>
            <Link href="/salud-estetica" className="hover:text-[#0F172A]">Salud & Estética</Link>
            <Link href="/educacion" className="hover:text-[#0F172A]">Educación</Link>
            <Link href="/login" className="rounded-[0.25rem] bg-[#131B2E] px-4 py-2 text-[13px] font-medium text-white">Acceder</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-[44px] font-bold leading-tight tracking-tight text-[#1B1B1D]">
          El portal digital para tu <span className="text-[#0F172A]">asesoría fiscal</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[18px] text-[#45464D]">
          Gestiona clientes, documentos fiscales, consultas y seguimiento de casos desde un solo lugar.
          Tu despacho con la misma profesionalidad, pero en digital.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/login" className="rounded-[0.25rem] bg-[#131B2E] px-6 py-3 text-[14px] font-medium text-white">Solicitar demo</Link>
          <Link href="/calendario" className="rounded-[0.25rem] border border-[#E2E8F0] px-6 py-3 text-[14px] font-medium text-[#45464D]">Ver booking público</Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-[28px] font-semibold text-[#1B1B1D]">Todo lo que necesita tu despacho</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-[0.5rem] border border-[#E2E8F0] bg-white p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.375rem] bg-[#F0EDEF] mb-4">
                    <Icon className="h-5 w-5 text-[#0F172A]" />
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{f.title}</h3>
                  <p className="mt-2 text-[14px] text-[#45464D]">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-[28px] font-semibold text-[#1B1B1D]">¿Listo para digitalizar tu asesoría?</h2>
          <p className="mt-3 text-[16px] text-[#45464D]">Configura tu portal en minutos. Sin compromiso.</p>
          <Link href="/login" className="mt-6 inline-block rounded-[0.25rem] bg-[#131B2E] px-8 py-3 text-[14px] font-medium text-white">Solicitar acceso</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] py-6 text-center text-[13px] text-[#45464D]">
        CRM-Master — Un producto para asesorías, salud y educación
      </footer>
    </div>
  );
}
