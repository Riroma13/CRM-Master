import { Bell, Mail, Star } from 'lucide-react';
import type { NavItem } from './types';

/**
 * Communication & notification navigation items.
 */
export const communicationNavItems: NavItem[] = [
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    href: '/admin/notificaciones',
    icon: Bell,
    order: 200,
    category: 'communication',
    module: 'notificaciones',
  },
  {
    id: 'email',
    label: 'Email',
    href: '/admin/email',
    icon: Mail,
    order: 210,
    category: 'communication',
    module: 'email',
  },
  {
    id: 'encuestas',
    label: 'Encuestas',
    href: '/admin/encuestas',
    icon: Star,
    order: 220,
    category: 'communication',
    module: 'encuestas',
  },
];
