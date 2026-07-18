import {
  LayoutDashboard,
  Users,
  TrendingUp,
  BarChart,
  Wallet,
  HardDrive,
} from 'lucide-react';
import type { NavItem } from './types';

/**
 * CRM & client management navigation items.
 */
export const crmNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    order: 10,
    category: 'crm',
    module: 'dashboard',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    href: '/admin/clientes',
    icon: Users,
    order: 20,
    category: 'crm',
    module: 'clientes',
  },
  {
    id: 'pipeline',
    label: 'Pipeline',
    href: '/admin/pipeline',
    icon: TrendingUp,
    order: 30,
    category: 'crm',
    module: 'pipeline',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    href: '/admin/reportes',
    icon: BarChart,
    order: 40,
    category: 'crm',
    module: 'reportes',
  },
  {
    id: 'presupuestos',
    label: 'Presupuestos',
    href: '/admin/presupuestos',
    icon: Wallet,
    order: 50,
    category: 'crm',
    module: 'presupuestos',
  },
  {
    id: 'sistemas',
    label: 'Sistemas',
    href: '/admin/sistemas',
    icon: HardDrive,
    order: 60,
    category: 'crm',
    module: 'sistemas',
  },
];
