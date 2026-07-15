'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClientes } from '@/hooks/use-clientes';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { ClienteForm } from '@/components/forms/cliente-form';
import { Plus, Search, Users } from 'lucide-react';

const SALUD_LABELS: Record<string, string> = { '🟢': 'Buena', '🟡': 'Media', '🔴': 'Crítica' };
const SALUD_COLORS: Record<string, string> = {
  '🟢': 'bg-[#D1FAE5] text-[#10B981]',
  '🟡': 'bg-[#FEF3C7] text-[#F59E0B]',
  '🔴': 'bg-[#FEE2E2] text-[#EF4444]',
};
const ESTADO_COLORS: Record<string, string> = {
  Activo: 'bg-[#D1FAE5] text-[#10B981]',
  'En pausa': 'bg-[#FEF3C7] text-[#F59E0B]',
  Cerrado: 'bg-[#F0EDEF] text-[#45464D]',
  Prospecto: 'bg-[#DAE2FD] text-[#131B2E]',
};

export default function ClientesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<{ search?: string }>({});
  const [showForm, setShowForm] = useState(false);
  const { clientes, isLoading, isError, error, refetch } = useClientes(filters);

  const handleSearch = () => {
    setFilters(search ? { search } : {});
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Clientes</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[160px] animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4">
              <div className="h-4 w-3/4 rounded bg-[#F0EDEF] mb-3" />
              <div className="h-3 w-1/2 rounded bg-[#F0EDEF] mb-2" />
              <div className="h-3 w-2/3 rounded bg-[#F0EDEF]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Clientes</h1>
        </div>
        <div className="rounded-[0.5rem] border border-[#EF4444]/30 bg-[#FEF2F2] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#EF4444]">Error al cargar clientes</p>
              <p className="text-xs text-[#45464D]">{error?.message || 'Error desconocido'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Clientes</h1>
        <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nuevo cliente
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#45464D]" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Buscar</Button>
        {filters.search && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilters({}); }}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Empty state */}
      {clientes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[0.5rem] border-2 border-dashed border-[#C6C6CD] bg-white p-12">
          <Users className="h-10 w-10 text-[#45464D] mb-3" />
          <p className="text-sm font-semibold text-[#45464D]">No hay clientes</p>
          <p className="mt-1 text-xs text-[#45464D]">
            {filters.search ? 'Prueba con otros términos de búsqueda' : 'Añade tu primer cliente para empezar'}
          </p>
        </div>
      )}

      {/* Client grid */}
      {clientes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <Card
              key={cliente.id}
              className="bg-white transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => router.push(`/admin/clientes/${cliente.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[16px] font-semibold text-[#1B1B1D]">{cliente.nombre}</h3>
                  <Badge variant="outline" className={SALUD_COLORS[cliente.saludGeneral] ?? ''}>
                    {cliente.saludGeneral} {SALUD_LABELS[cliente.saludGeneral] ?? cliente.saludGeneral}
                  </Badge>
                </div>
                {cliente.tipoNegocio && (
                  <p className="text-[13px] text-[#45464D] mb-2">{cliente.tipoNegocio}</p>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={ESTADO_COLORS[cliente.estadoRelacion] ?? ''}>
                    {cliente.estadoRelacion}
                  </Badge>
                </div>
                {cliente.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {cliente.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="default"
                        className={`text-[10px] cursor-pointer transition-colors ${
                          filters.search === tag ? 'ring-2 ring-[#131B2E]' : 'hover:ring-1 hover:ring-[#131B2E]'
                        }`}
                        onClick={(e) => { e.stopPropagation(); setSearch(tag); setFilters({ search: tag }); }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-[12px] text-[#45464D] border-t border-[#E2E8F0] pt-3">
                  <span>{cliente._count.sistemas} sistemas</span>
                  <span>{cliente._count.tareas} tareas</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Create dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} title="Nuevo cliente">
        <ClienteForm
          onSuccess={() => { setShowForm(false); refetch(); toast('success', 'Cliente creado correctamente'); }}
          onCancel={() => setShowForm(false)}
        />
      </Dialog>
    </div>
  );
}
