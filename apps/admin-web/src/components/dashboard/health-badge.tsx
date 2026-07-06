'use client';

import { Badge } from '@/components/ui/badge';

const variantMap: Record<string, 'success' | 'warning' | 'critical' | 'default'> = {
  '🟢': 'success',
  '🟡': 'warning',
  '🔴': 'critical',
};

const labelMap: Record<string, string> = {
  '🟢': 'Buena',
  '🟡': 'Media',
  '🔴': 'Crítica',
};

interface HealthBadgeProps {
  salud: string;
}

export function HealthBadge({ salud }: HealthBadgeProps) {
  const variant = variantMap[salud] ?? 'default';
  const label = labelMap[salud] ?? salud;

  return (
    <Badge variant={variant} className="gap-1">
      <span className="text-[10px]" aria-hidden="true">
        {salud}
      </span>
      {label}
    </Badge>
  );
}
