import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function ClientsRootLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
