import { Calendar, Briefcase, BookOpen, AlertTriangle, ClipboardList } from 'lucide-react';
import type { NavItem } from './types';

/**
 * Scheduling & calendar navigation items.
 */
export const schedulingNavItems: NavItem[] = [
  {
    id: 'calendario',
    label: 'Calendario',
    href: '/admin/calendario',
    icon: Calendar,
    order: 100,
    category: 'scheduling',
    module: 'calendario',
  },
  {
    id: 'recursos',
    label: 'Recursos',
    href: '/admin/recursos',
    icon: Briefcase,
    order: 110,
    category: 'scheduling',
    module: 'recursos',
  },
  {
    id: 'calendarioAcademico',
    label: 'Cal. Académico',
    href: '/admin/calendario-academico',
    icon: BookOpen,
    order: 120,
    category: 'scheduling',
    module: 'calendarioAcademico',
  },
  {
    id: 'calendar',
    label: 'Google Calendar',
    href: '/admin/calendar-sync',
    icon: Calendar,
    order: 130,
    category: 'scheduling',
    module: 'calendar',
  },
  {
    id: 'incidencias',
    label: 'Incidencias',
    href: '/admin/incidencias',
    icon: AlertTriangle,
    order: 140,
    category: 'scheduling',
    module: 'incidencias',
  },
  {
    id: 'tareas',
    label: 'Tareas',
    href: '/admin/tareas',
    icon: ClipboardList,
    order: 150,
    category: 'scheduling',
    module: 'tareas',
  },
];
