'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Bell, Save, CheckCircle, XCircle } from 'lucide-react';

export default function NotificacionesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [reminderHours, setReminderHours] = useState('24');

  useEffect(() => {
    api.get<any>('/api/v1/tenant/notifications-config', undefined, { auth: true })
      .then((d) => {
        setConfig(d);
        if (d.smtp) {
          setSmtpHost(d.smtp.host ?? '');
          setSmtpPort(String(d.smtp.port ?? '587'));
          setSmtpUser(d.smtp.user ?? '');
          setFromEmail(d.smtp.fromEmail ?? '');
        }
        setReminderHours(String(d.reminderHours ?? '24'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const smtp = smtpHost && smtpUser
        ? { host: smtpHost, port: parseInt(smtpPort, 10) || 587, user: smtpUser, pass: smtpPass, fromEmail: fromEmail || smtpUser }
        : null;

      await api.put('/api/v1/tenant/notifications-config', {
        smtp,
        reminderHours: parseInt(reminderHours, 10) || 24,
      }, { auth: true });

      toast('success', 'Configuración guardada');
    } catch {
      toast('error', 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Notificaciones</h1>
        <div className="h-64 animate-pulse rounded-[0.5rem] border border-[#E2E8F0] bg-white p-6" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-[16px] font-semibold text-[#1B1B1D]">Notificaciones</h1>

      {/* Status */}
      <Card className="bg-white">
        <CardContent className="p-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-[#45464D]" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#1B1B1D]">Recordatorio automático de citas</p>
            <p className="text-[11px] text-[#45464D]">
              Cada 5 minutos revisamos si hay citas próximas y enviamos recordatorio por email.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {config?.smtpConfigured
              ? <><CheckCircle className="h-4 w-4 text-[#10B981]" /><span className="text-[11px] text-[#10B981]">Activo</span></>
              : <><XCircle className="h-4 w-4 text-[#EF4444]" /><span className="text-[11px] text-[#EF4444]">Sin configurar</span></>
            }
          </div>
        </CardContent>
      </Card>

      {/* SMTP Config */}
      <Card className="bg-white">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-[16px] font-semibold text-[#1B1B1D]">Servidor SMTP</h2>
          <p className="text-[13px] text-[#45464D]">Configura un servidor SMTP para enviar emails transaccionales (recordatorios, notificaciones).</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Host</label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Puerto</label>
              <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Usuario</label>
              <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="tu@email.com" className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Contraseña</label>
              <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••" className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">Email remitente</label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="noreply@tudominio.com" className="mt-1" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#45464D]">
                Recordatorio (horas antes)
              </label>
              <Input
                type="number"
                min={1}
                max={168}
                value={reminderHours}
                onChange={(e) => setReminderHours(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" className="gap-1.5 bg-[#131B2E] text-xs text-white" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
