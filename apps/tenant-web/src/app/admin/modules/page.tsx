'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useModules } from '@/hooks/use-modules';
import { Save, Check, X } from 'lucide-react';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  pipeline: 'Pipeline',
  reportes: 'Reportes',
  presupuestos: 'Presupuestos',
  webhooks: 'Webhooks',
  plantillas: 'Plantillas',
  email: 'Email',
  automations: 'Automatizaciones',
  pagos: 'Pagos',
  calendar: 'Google Calendar',
  encuestas: 'Encuestas',
  planes: 'Plan',
  calendarioAcademico: 'Cal. Académico',
  preferencias: 'Preferencias',
  cambiarPassword: 'Seguridad',
  documentos: 'Documentos',
  tareas: 'Tareas',
  calendario: 'Calendario',
  recursos: 'Recursos',
  notificaciones: 'Notificaciones',
  incidencias: 'Incidencias',
  sistemas: 'Sistemas',
  perfil: 'Perfil',
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  dashboard: 'Panel principal con KPIs y actividad reciente',
  clientes: 'Gestión de clientes, contactos y segmentación',
  pipeline: 'Kanban comercial: prospecto → activo → cerrado',
  reportes: 'KPIs, estadísticas y exportación de datos',
  presupuestos: 'Creación y seguimiento de presupuestos',
  webhooks: 'Integración con servicios externos vía webhooks',
  plantillas: 'Plantillas reutilizables para documentos',
  email: 'Envío de emails desde el CRM',
  automations: 'Reglas si-esto-entonces-aquello',
  pagos: 'Registro de pagos y transacciones',
  calendar: 'Sincronización con Google Calendar',
  encuestas: 'Encuestas de satisfacción post-servicio',
  planes: 'Plan y suscripción del tenant',
  calendarioAcademico: 'Festivos, exámenes y eventos escolares',
  preferencias: 'Canales de notificación por usuario',
  cambiarPassword: 'Cambio de contraseña y seguridad',
  documentos: 'Subida, descarga y compartición de documentos',
  tareas: 'Kanban board con tareas y seguimiento',
  calendario: 'Citas, horarios, reserva pública y disponibilidad',
  recursos: 'Profesionales, espacios y equipos reservables',
  notificaciones: 'Configuración de notificaciones y recordatorios',
  incidencias: 'Gestión de incidencias, tickets y seguimiento con SLA',
  sistemas: 'Inventario de sistemas y equipamiento técnico',
  perfil: 'Configuración del negocio, nombre y logo',
};

export default function ModulesPage() {
  const { toast } = useToast();
  const { available, enabled, isLoading, refetch } = useModules();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (enabled.length > 0) setSelected(enabled);
  }, [enabled]);

  const toggle = (id: string) => {
    // Dashboard y perfil no se pueden desactivar
    if (id === 'dashboard' || id === 'perfil') return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/v1/tenant/modules', { enabled: selected }, { auth: true });
      toast('success', 'Módulos actualizados. Recarga la página para ver los cambios.');
      refetch();
    } catch {
      toast('error', 'Error al guardar módulos');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Módulos</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-4" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Módulos</h1>
        <Button
          size="sm"
          className="gap-1.5 bg-[#131B2E] text-xs text-white"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      <p className="text-[13px] text-[#45464D]">
        Activa o desactiva módulos para este tenant. Los módulos desactivados no aparecerán en el menú lateral.
        Dashboard y Perfil son obligatorios.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((mod) => {
          const isOn = selected.includes(mod.id);
          const isFixed = mod.id === 'dashboard' || mod.id === 'perfil';

          return (
            <Card
              key={mod.id}
              className={`bg-white cursor-pointer transition-all ${
                isOn ? 'ring-2 ring-[#131B2E]' : 'opacity-60 hover:opacity-80'
              }`}
              onClick={() => toggle(mod.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[16px] font-semibold text-[#1B1B1D]">
                    {MODULE_LABELS[mod.id] ?? mod.id}
                  </h3>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isOn ? 'bg-[#D1FAE5] text-[#10B981]' : 'bg-[#F0EDEF] text-[#45464D]'
                  }`}>
                    {isOn ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                </div>
                <p className="text-[13px] text-[#45464D]">
                  {MODULE_DESCRIPTIONS[mod.id] ?? ''}
                </p>
                {isFixed && (
                  <p className="text-[11px] text-[#45464D] mt-2 italic">Obligatorio</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
