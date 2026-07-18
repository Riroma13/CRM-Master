import type { ElementType } from 'react';

/**
 * A single navigation item.
 *
 * Each feature module owns its own NavItem definition.
 * The NavigationRegistry composes all items into a tree.
 */
export interface NavItem {
  /** Unique identifier — matches the module id from the API */
  id: string;
  /** Display label in the sidebar and breadcrumbs */
  label: string;
  /** Route href */
  href: string;
  /** Lucide icon component */
  icon: ElementType;
  /** Display order (lower = first) */
  order: number;
  /** Feature category for grouping */
  category: NavCategory;
  /** Whether this item requires an enabled module */
  module?: string;
  /** Always visible regardless of module state */
  alwaysVisible?: boolean;
  /** Render a separator before this item */
  separator?: boolean;
}

export type NavCategory =
  | 'crm'
  | 'scheduling'
  | 'communication'
  | 'automation'
  | 'admin'
  | 'system';
