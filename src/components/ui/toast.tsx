"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

/**
 * Toasts sutiles. Entran con fade + slide (240ms), se cierran solos a los 4s
 * (la barra inferior muestra el tiempo restante), se pausan al pasar el mouse
 * y son descartables. `prefers-reduced-motion` lo maneja globals.css.
 */
type ToastTone = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number; tone: ToastTone };

const DURATION = 4000;

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: TriangleAlert,
  info: Info,
};

const ACCENT: Record<ToastTone, string> = {
  success: "text-green-700",
  error: "text-red-700",
  info: "text-accent",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setToasts((list) => [...list, { id, tone: t.tone ?? "info", ...t }]);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notificaciones"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const Icon = ICON[toast.tone];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(onClose, DURATION);
    return () => clearTimeout(timer);
  }, [paused, onClose]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto animate-slide-in overflow-hidden rounded-lg border border-border bg-surface-raised shadow-lg"
    >
      <div className="flex items-start gap-3 p-3.5">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ACCENT[toast.tone]}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-small font-semibold text-foreground">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-small text-muted-foreground">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="-m-1 shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        className="h-0.5 origin-left bg-accent/60"
        style={{
          animation: paused ? "none" : `toast-progress ${DURATION}ms linear forwards`,
        }}
      />
      <style>{`@keyframes toast-progress{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
    </div>
  );
}
