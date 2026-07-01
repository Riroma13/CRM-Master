import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mission Control | CRM-Master',
  description: 'Panel de supervisión multi-tenant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
