import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#E2E8F0]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[0.375rem] bg-[#0F172A]">
              <span className="text-xs font-bold text-white">C</span>
            </div>
            <span className="text-[16px] font-semibold">CRM-Master</span>
          </div>
          <nav className="flex items-center gap-6 text-[14px] text-[#45464D]">
            <Link href="/fiscal" className="hover:text-[#0F172A]">Asesorías</Link>
            <Link href="/salud-estetica" className="hover:text-[#0F172A]">Salud & Estética</Link>
            <Link href="/educacion" className="hover:text-[#0F172A]">Educación</Link>
            <Link href="/login" className="rounded-[0.25rem] bg-[#131B2E] px-4 py-2 text-[13px] font-medium text-white">Acceder</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-4xl text-[52px] font-bold leading-tight tracking-tight text-[#1B1B1D]">
          El portal de gestión que se adapta a tu negocio
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[18px] text-[#45464D]">
          Un mismo producto. El vocabulario de tu sector.
          Reservas, clientes, documentos e incidencias — sin importar tu vertical.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/fiscal" className="rounded-[0.25rem] bg-[#131B2E] px-6 py-3 text-[14px] font-medium text-white">Ver para asesorías</Link>
          <Link href="/salud-estetica" className="rounded-[0.25rem] border border-[#E2E8F0] px-6 py-3 text-[14px] font-medium text-[#45464D] hover:bg-[#F8FAFC]">Ver para salud</Link>
          <Link href="/educacion" className="rounded-[0.25rem] border border-[#E2E8F0] px-6 py-3 text-[14px] font-medium text-[#45464D] hover:bg-[#F8FAFC]">Ver para educación</Link>
        </div>
      </section>

      <section className="border-t border-[#E2E8F0] bg-[#F8FAFC] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-[28px] font-semibold text-[#1B1B1D]">Una plataforma, tres verticales</h2>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: 'Asesoría fiscal', href: '/fiscal', desc: 'Clientes, consultas, expedientes y casos. El vocabulario de tu despacho.' },
              { title: 'Salud & Estética', href: '/salud-estetica', desc: 'Reserva online, profesionales, recordatorios y portal del cliente.' },
              { title: 'Educación', href: '/educacion', desc: 'Familias, tutorías, incidencias y documentación escolar.' },
            ].map((v) => (
              <Link key={v.href} href={v.href} className="rounded-[0.5rem] border border-[#E2E8F0] bg-white p-6 transition-shadow hover:shadow-md">
                <h3 className="text-[18px] font-semibold text-[#1B1B1D]">{v.title}</h3>
                <p className="mt-2 text-[14px] text-[#45464D]">{v.desc}</p>
                <span className="mt-4 inline-block text-[13px] font-medium text-[#0F172A]">Saber más →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] py-6 text-center text-[13px] text-[#45464D]">
        CRM-Master — Un producto para asesorías, salud y educación
      </footer>
    </div>
  );
}
