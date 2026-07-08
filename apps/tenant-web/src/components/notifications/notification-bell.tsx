'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificaciones } from '@/hooks/use-notificaciones';
import Link from 'next/link';

export function NotificationBell() {
  const { notificaciones, noLeidas, refetch, markAsRead, markAllAsRead } = useNotificaciones();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-[0.25rem] p-1.5 text-[#45464D] hover:bg-[#F0EDEF]"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-[0.5rem] border border-[#E2E8F0] bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-2">
            <span className="text-[13px] font-semibold text-[#1B1B1D]">Notificaciones</span>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button onClick={() => { markAllAsRead(); }} className="text-[11px] text-[#0F172A] hover:underline">
                  Leer todo
                </button>
              )}
              <button onClick={refetch} className="text-[11px] text-[#45464D] hover:text-[#1B1B1D]">
                Actualizar
              </button>
            </div>
          </div>

          {notificaciones.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] text-[#45464D]">No hay notificaciones</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notificaciones.map((n) => (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => { setOpen(false); if (!n.leida) markAsRead(n.id); }}
                  className={`block border-b border-[#E2E8F0] px-4 py-3 transition-colors hover:bg-[#F8FAFC] last:border-0 ${!n.leida ? 'bg-[#F8FAFC]' : ''}`}
                >
                  <p className="text-[13px] font-medium text-[#1B1B1D]">{n.titulo}</p>
                  {n.descripcion && (
                    <p className="text-[11px] text-[#45464D]">{n.descripcion}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-[#45464D]">
                    {new Date(n.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
