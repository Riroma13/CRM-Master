import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  active: { label: 'Active', variant: 'success' as const },
  pending: { label: 'Pending', variant: 'warning' as const },
  failed: { label: 'Failed', variant: 'critical' as const },
  inactive: { label: 'Inactive', variant: 'default' as const },
} as const;

type Status = keyof typeof STATUS_CONFIG;

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLowerCase() as Status] ?? STATUS_CONFIG.inactive;

  return <Badge variant={config.variant}>{label ?? config.label}</Badge>;
}

export { STATUS_CONFIG };
