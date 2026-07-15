'use client';

import { useMemo, useState } from 'react';
import { KpiBar } from './components/kpi-bar';
import { CitaList } from './components/cita-list';
import { ScheduleEditor } from './components/schedule-editor';
import { BlockedDates } from './components/blocked-dates';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { CitaForm } from '@/components/forms/cita-form';
import { useCitas } from '@/hooks/use-citas';
import { useDisponibilidad } from '@/hooks/use-disponibilidad';
import type { DaySchedule } from '@/lib/api-types';
import { Plus } from 'lucide-react';

export default function AdminCalendarioPage() {
  const { toast } = useToast();
  const { citas, isLoading, isError, error, confirmCita, cancelCita, refetch } =
    useCitas();
  const { config, isLoading: configLoading, updateConfig } = useDisponibilidad();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCitaForm, setShowCitaForm] = useState(false);

  // Compute KPIs from citas
  const kpis = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    return {
      hoy: citas.filter((c) => c.fecha.startsWith(today)).length,
      pendientes: citas.filter((c) => c.estado === 'pendiente').length,
      semana: citas.filter((c) => c.fecha >= weekStartStr).length,
    };
  }, [citas]);

  // Local schedule state for editing
  const [localSchedule, setLocalSchedule] = useState<DaySchedule[] | null>(null);
  const [localBlockedDates, setLocalBlockedDates] = useState<string[] | null>(null);

  const schedule = localSchedule ?? config?.dailySchedule ?? [];
  const blockedDates = localBlockedDates ?? config?.blockedDates ?? [];

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateConfig({
        ...config,
        dailySchedule: localSchedule ?? config.dailySchedule,
        blockedDates: localBlockedDates ?? config.blockedDates,
      });
      setLocalSchedule(null);
      setLocalBlockedDates(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al guardar la configuración';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = localSchedule !== null || localBlockedDates !== null;

  return (
    <div className="space-y-6" data-testid="admin-calendario-page">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={() => setShowCitaForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Nueva cita
          </Button>
          <button
            onClick={refetch}
            className="rounded-[0.25rem] border border-[#E2E8F0] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#45464D] hover:bg-[#F0EDEF]"
          >
            Refrescar
          </button>
        </div>
      </div>

      <KpiBar kpis={kpis} />

      <CitaList
        citas={citas}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onConfirm={confirmCita}
        onCancel={cancelCita}
      />

      {/* Config section */}
      <div className="space-y-6 rounded-[0.5rem] border border-[#E2E8F0] bg-white p-6 shadow-ambient">
        <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Configuración</h2>

        {configLoading && (
          <p className="text-[13px] text-[#45464D]">Cargando configuración...</p>
        )}

        {!configLoading && config && (
          <>
            <ScheduleEditor
              schedule={schedule}
              onChange={(s) => setLocalSchedule(s)}
            />

            <hr className="border-[#E2E8F0]" />

            <BlockedDates
              dates={blockedDates}
              onChange={(d) => setLocalBlockedDates(d)}
            />

            {saveError && (
              <div className="mb-3 rounded-[0.5rem] border-2 border-[#EF4444] bg-[#FEF2F2] p-3">
                <p className="text-[13px] font-medium text-[#991B1B]">{saveError}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  data-testid="save-config"
                  className="rounded-[0.25rem] bg-[#131B2E] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0F172A] disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>
          </>
        )}
      </div>
      {/* Create cita dialog */}
      <Dialog open={showCitaForm} onClose={() => setShowCitaForm(false)} title="Nueva cita">
        <CitaForm
          onSuccess={() => { setShowCitaForm(false); refetch(); toast('success', 'Cita creada correctamente'); }}
          onCancel={() => setShowCitaForm(false)}
        />
      </Dialog>
    </div>
  );
}
