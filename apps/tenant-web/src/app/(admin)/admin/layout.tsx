import { SidebarLayout } from '@/components/layout/sidebar-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
