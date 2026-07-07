import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active', !isActive && 'inactive')).toBe('base active');
  });

  it('resolves conflicts with tailwind-merge', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });

  it('handles class-variance-authority arrays', () => {
    expect(cn(['one', 'two'], 'three')).toBe('one two three');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('filters falsy values', () => {
    expect(cn('px-4', false && 'hidden', undefined, null, 'py-2')).toBe('px-4 py-2');
  });
});
