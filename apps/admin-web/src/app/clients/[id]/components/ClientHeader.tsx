import { HealthBadge } from '@/components/dashboard/health-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { ClienteDetail } from '@/lib/api-types';

interface ClientHeaderProps {
  cliente: ClienteDetail;
}

export function ClientHeader({ cliente }: ClientHeaderProps) {
  return (
    <div className="flex items-start justify-between rounded-[0.5rem] border border-[#E2E8F0] bg-white p-5">
      <div className="space-y-3">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight text-[#1B1B1D]">
            {cliente.nombre}
          </h1>
          {cliente.tipoNegocio && (
            <p className="mt-1 text-sm text-[#45464D]">{cliente.tipoNegocio}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <HealthBadge salud={cliente.saludGeneral} />
          {cliente.tags.map((tag) => (
            <Badge key={tag} variant="default" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>

        {cliente.contactoPrincipal && (
          <p className="text-sm text-[#45464D]">
            <span className="font-medium">Contacto:</span> {cliente.contactoPrincipal}
          </p>
        )}

        {cliente.fechaInicio && (
          <p className="text-sm text-[#45464D]">
            <span className="font-medium">Desde:</span>{' '}
            {new Date(cliente.fechaInicio).toLocaleDateString('es-AR', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
        )}
      </div>

      <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled>
        <Pencil className="h-3.5 w-3.5" />
        Editar
      </Button>
    </div>
  );
}
