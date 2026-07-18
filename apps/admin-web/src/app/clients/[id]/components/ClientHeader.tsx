'use client';

import { MapPin, Phone, Mail, Pencil } from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@crm-master/ui';
import type { ClienteDetail } from '@/lib/api-types';

interface ClientHeaderProps {
  client: ClienteDetail;
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <Card className="bg-white">
      <CardContent className="flex items-start gap-6 p-5">
        {/* Avatar */}
        <div className="flex h-20 w-20 items-center justify-center rounded-[0.5rem] bg-[#0F172A]">
          <span className="text-2xl font-bold text-white">
            {client.nombre.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2">
          <h1 className="text-[24px] font-semibold leading-tight text-[#1B1B1D]">
            {client.nombre}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#45464D]">
            {client.tipoNegocio && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {client.tipoNegocio}
              </span>
            )}
            {client.contactoPrincipal && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {client.contactoPrincipal}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {client.tenant.name}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-[#10B981]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#10B981]" />
            HEALTH: {client.saludGeneral}
          </span>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Pencil className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
