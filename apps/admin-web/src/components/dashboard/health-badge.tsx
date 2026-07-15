import { Badge } from '@crm-master/ui';

type Salud = '🟢' | '🟡' | '🔴';
type BadgeVariant = 'success' | 'warning' | 'critical';

const variantMap: Record<Salud, BadgeVariant> = {
  '🟢': 'success',
  '🟡': 'warning',
  '🔴': 'critical',
};

const labelMap: Record<Salud, string> = {
  '🟢': 'Buena',
  '🟡': 'Media',
  '🔴': 'Crítica',
};

interface HealthBadgeProps {
  salud: Salud;
}

export function HealthBadge({ salud }: HealthBadgeProps) {
  return (
    <Badge variant={variantMap[salud]} className="gap-1">
      <span className="text-[10px]" aria-hidden="true">
        {salud}
      </span>
      {labelMap[salud]}
    </Badge>
  );
}
