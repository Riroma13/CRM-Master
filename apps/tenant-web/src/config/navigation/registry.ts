import type { NavItem } from './types';
import { crmNavItems } from './crm';
import { schedulingNavItems } from './scheduling';
import { communicationNavItems } from './communication';
import { automationNavItems } from './automation';
import { adminNavItems } from './admin';
import { staticNavItems } from './static';

/**
 * Navigation Registry.
 *
 * Composes all feature navigation items into a single sorted tree.
 * Contains no feature-specific logic — only composition and sorting.
 */
export class NavigationRegistry {
  private items: NavItem[];

  constructor() {
    this.items = [
      ...crmNavItems,
      ...schedulingNavItems,
      ...communicationNavItems,
      ...automationNavItems,
      ...adminNavItems,
      ...staticNavItems,
    ].sort((a, b) => a.order - b.order);
  }

  /** All navigation items sorted by order */
  getAll(): NavItem[] {
    return this.items;
  }

  /** Items filtered by module visibility */
  getVisible(isEnabled: (moduleId: string) => boolean): NavItem[] {
    return this.items.filter(
      (item) => item.alwaysVisible || (item.module && isEnabled(item.module)),
    );
  }

  /** Get a single item by id */
  find(id: string): NavItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  /** Resolve breadcrumb label from path segments */
  getLabelForSegment(segment: string): string | undefined {
    const item = this.items.find((i) => i.id === segment);
    return item?.label;
  }
}

/** Singleton registry instance */
export const navigationRegistry = new NavigationRegistry();
