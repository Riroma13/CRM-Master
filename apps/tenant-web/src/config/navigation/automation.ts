import { Zap, Webhook, FileDigit, Bell } from 'lucide-react';
import type { NavItem } from './types';

/**
 * Automation & template navigation items.
 */
export const automationNavItems: NavItem[] = [
  {
    id: 'automations',
    label: 'Automatizaciones',
    href: '/admin/automations',
    icon: Zap,
    order: 300,
    category: 'automation',
    module: 'automations',
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    href: '/admin/webhooks',
    icon: Webhook,
    order: 310,
    category: 'automation',
    module: 'webhooks',
  },
  {
    id: 'plantillas',
    label: 'Plantillas',
    href: '/admin/plantillas',
    icon: FileDigit,
    order: 320,
    category: 'automation',
    module: 'plantillas',
  },
  {
    id: 'preferencias',
    label: 'Preferencias',
    href: '/admin/preferencias',
    icon: Bell,
    order: 330,
    category: 'automation',
    module: 'preferencias',
  },
];
