import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HealthBadge } from '@/components/dashboard/health-badge';
import { ExternalLink } from 'lucide-react';
import type { ClienteDetail } from '@/lib/api-types';

interface TabSistemasProps {
  cliente: ClienteDetail;
}

export function TabSistemas({ cliente }: TabSistemasProps) {
  if (cliente.sistemas.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-[#45464D]">
            Este cliente no tiene sistemas registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        {cliente.sistemas.map((sistema, idx) => (
          <div
            key={sistema.id}
            className={`flex items-center gap-4 p-4 ${
              idx < cliente.sistemas.length - 1 ? 'border-b border-[#E2E8F0]' : ''
            }`}
          >
            {/* Info */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#1B1B1D]">
                  {sistema.nombreSistema}
                </span>
                {sistema.version && (
                  <span className="text-[11px] text-[#45464D]">
                    {sistema.version}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[12px] text-[#45464D]">
                <span>{sistema.tipo}</span>
                {sistema.entorno && (
                  <>
                    <span className="text-[#E2E8F0]">·</span>
                    <span>{sistema.entorno}</span>
                  </>
                )}
                {sistema.fechaUltimoChequeo && (
                  <>
                    <span className="text-[#E2E8F0]">·</span>
                    <span>
                        Último chequeo:{' '}
                        {new Date(sistema.fechaUltimoChequeo).toLocaleDateString(
                          'es-AR',
                        )}
                      </span>
                  </>
                )}
              </div>
            </div>

            {/* Health */}
            <HealthBadge salud={sistema.estadoTecnico} />

            {/* Actions */}
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <a href={`/systems/${sistema.id}`}>
                <ExternalLink className="h-3 w-3" />
                Detalle
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
