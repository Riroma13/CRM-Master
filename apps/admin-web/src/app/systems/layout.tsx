import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function SystemsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
