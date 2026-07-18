import {
  Settings,
  Lock,
  CreditCard,
  CreditCard as PlanIcon,
  FileText,
  ToggleLeft,
} from 'lucide-react';
import type { NavItem } from './types';

/**
 * Admin & settings navigation items.
 */
export const adminNavItems: NavItem[] = [
  {
    id: 'perfil',
    label: 'Perfil',
    href: '/admin/perfil',
    icon: Settings,
    order: 400,
    category: 'admin',
    module: 'perfil',
  },
  {
    id: 'cambiarPassword',
    label: 'Seguridad',
    href: '/admin/cambiar-password',
    icon: Lock,
    order: 410,
    category: 'admin',
    module: 'cambiarPassword',
  },
  {
    id: 'pagos',
    label: 'Pagos',
    href: '/admin/pagos',
    icon: CreditCard,
    order: 420,
    category: 'admin',
    module: 'pagos',
  },
  {
    id: 'planes',
    label: 'Plan',
    href: '/admin/planes',
    icon: PlanIcon,
    order: 430,
    category: 'admin',
    module: 'planes',
  },
  {
    id: 'documentos',
    label: 'Documentos',
    href: '/admin/documentos',
    icon: FileText,
    order: 440,
    category: 'admin',
    module: 'documentos',
  },
  {
    id: 'modules',
    label: 'Módulos',
    href: '/admin/modules',
    icon: ToggleLeft,
    order: 1000,
    category: 'admin',
    separator: true,
    alwaysVisible: true,
  },
];
