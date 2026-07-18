import { Rocket, History } from 'lucide-react';
import type { NavItem } from './types';

/**
 * Static navigation items — always visible, no module dependency.
 */
export const staticNavItems: NavItem[] = [
  {
    id: 'onboarding',
    label: 'Onboarding',
    href: '/admin/onboarding',
    icon: Rocket,
    order: 900,
    category: 'system',
    alwaysVisible: true,
  },
  {
    id: 'audit',
    label: 'Auditoría',
    href: '/admin/audit',
    icon: History,
    order: 910,
    category: 'system',
    alwaysVisible: true,
  },
];
