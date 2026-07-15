'use client';

import { Card, CardContent } from '@crm-master/ui';
import { Badge } from '@crm-master/ui';
import { Button } from '@crm-master/ui';
import { HealthBadge } from './health-badge';
import type { ClienteListItem } from '@/lib/api-types';

function formatDate(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface ClientCardProps {
  client: ClienteListItem;
}

export function ClientCard({ client }: ClientCardProps) {
  const systemCount = client.sistemas?.length ?? 0;
  const systemLabel = systemCount === 1 ? '1 system' : `${systemCount} systems`;

  return (
    <Card className="bg-white transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[16px] font-semibold text-on-surface truncate">
              {client.nombre}
            </h3>
            <HealthBadge salud={client.saludGeneral} />
          </div>
        </div>

        {/* Tenant */}
        <p className="mb-2 text-[12px] text-on-surface-variant truncate">
          {client.tenant.name}
        </p>

        {/* Divider */}
        <div className="mb-3 border-t border-border-subtle" />

        {/* Stats row */}
        <div className="mb-3 flex items-center justify-between text-sm">
          <div>
            <span className="text-on-surface-variant">{systemLabel}</span>
          </div>
          <div>
            <span className="text-on-surface-variant">Pending</span>
            <span className="ml-1 font-semibold text-on-surface">
              {client.tareasPendientes}
            </span>
          </div>
        </div>

        {/* Tags */}
        {client.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Last activity */}
        {client.ultimaActividad && (
          <p className="mb-3 text-[11px] text-on-surface-variant">
            Last activity: {formatDate(client.ultimaActividad)}
          </p>
        )}

        {/* Action */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs uppercase tracking-[0.05em]"
          asChild
        >
          <a href={`/clients/${client.id}`}>View Client</a>
        </Button>
      </CardContent>
    </Card>
  );
}
