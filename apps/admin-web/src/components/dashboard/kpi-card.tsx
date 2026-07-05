import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
}

export function KpiCard({ icon: Icon, label, value, subtitle }: KpiCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-variant">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-[30px] font-bold leading-none tracking-tight text-on-surface">
              {value}
            </span>
            {subtitle && (
              <span className="text-[13px] font-medium text-on-surface-variant">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
