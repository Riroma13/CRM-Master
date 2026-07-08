'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const ICONS = {
    success: <CheckCircle className="h-4 w-4 text-[#10B981]" />,
    error: <XCircle className="h-4 w-4 text-[#EF4444]" />,
    info: <AlertCircle className="h-4 w-4 text-[#0F172A]" />,
  };

  const BORDERS = {
    success: 'border-l-[#10B981]',
    error: 'border-l-[#EF4444]',
    info: 'border-l-[#0F172A]',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-[0.5rem] border border-[#E2E8F0] bg-white px-4 py-3 shadow-lg animate-in slide-in-from-right ${
              BORDERS[t.type]
            }`}
            style={{ borderLeftWidth: '3px' }}
          >
            {ICONS[t.type]}
            <p className="text-[13px] text-[#1B1B1D] flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-[#45464D] hover:text-[#1B1B1D]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
