import { describe, expect, it } from 'vitest';
import { adminNavItems } from './admin';

describe('admin navigation', () => {
  it('registers Settings as a feature-owned admin item', () => {
    expect(adminNavItems).toContainEqual(expect.objectContaining({
      id: 'settings', label: 'Configuración', href: '/admin/settings', category: 'admin',
    }));
  });
});
