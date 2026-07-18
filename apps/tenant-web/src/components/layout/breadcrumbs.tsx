'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { navigationRegistry } from '@/config/navigation';

interface BreadcrumbsProps {
  pathname: string;
}

/**
 * Renders breadcrumbs from the navigation registry.
 *
 * Each path segment is resolved against the registry's labels.
 * Segments without a registered label use the segment as-is.
 */
export function Breadcrumbs({ pathname }: BreadcrumbsProps) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = navigationRegistry.getLabelForSegment(seg) ?? seg;
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-[#45464D] mb-4" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-[#C6C6CD]" />}
          {c.isLast ? (
            <span className="font-medium text-[#1B1B1D]">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-[#1B1B1D] transition-colors">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
