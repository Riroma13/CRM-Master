'use client';

import { ChevronRight } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@crm-master/ui';
import Link from 'next/link';
import type { SistemaDetail } from '@/lib/api-types';

interface TabSistemasProps {
  sistemas: SistemaDetail[];
}

function statusColor(estado: string): string {
  if (estado.includes('🟢')) return 'bg-[#10B981]';
  if (estado.includes('🟡')) return 'bg-[#F59E0B]';
  if (estado.includes('🔴')) return 'bg-[#EF4444]';
  return 'bg-[#C6C6CD]';
}

export function TabSistemas({ sistemas }: TabSistemasProps) {
  if (sistemas.length === 0) {
    return (
      <Card className="bg-white">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#45464D]">No hay sistemas registrados para este cliente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        {sistemas.map((sys, i) => (
          <div
            key={sys.id}
            className={`flex items-center gap-4 p-4 ${i < sistemas.length - 1 ? 'border-b border-[#E2E8F0]' : ''}`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${statusColor(sys.estadoTecnico)}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1B1B1D]">{sys.nombreSistema}</p>
              <p className="text-xs text-[#45464D]">
                {sys.tipo}{sys.entorno ? ` · ${sys.entorno}` : ''}{sys.version ? ` · v${sys.version}` : ''}
              </p>
            </div>
            <Badge variant="default" className="text-[10px]">
              {sys.estadoTecnico}
            </Badge>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href={`/systems/${sys.id}`}>
                Details <ChevronRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
