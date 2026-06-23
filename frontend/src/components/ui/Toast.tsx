import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastState | null;
  onClose?: () => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error:   <AlertCircle  className="w-4 h-4 text-red-400 shrink-0" />,
  info:    <Info         className="w-4 h-4 text-blue-400 shrink-0" />,
};

const accents: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error:   'border-l-red-500',
  info:    'border-l-blue-500',
};

export default function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`
        fixed bottom-5 right-5 z-[9999]
        flex items-center gap-3
        pl-4 pr-5 py-3.5
        bg-zinc-900/95 dark:bg-zinc-950/98
        border border-zinc-700/60 dark:border-zinc-800
        border-l-[3px] ${accents[toast.type]}
        text-white
        rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.35)]
        backdrop-blur-md
        animate-in slide-in-from-bottom-4 fade-in duration-250
        max-w-[320px]
      `}
    >
      {icons[toast.type]}
      <span className="text-[13px] font-bold leading-snug tracking-wide flex-1">
        {toast.message}
      </span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ml-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** Inline alert banner for use inside modals/forms */
export function AlertBanner({
  message,
  type = 'error',
}: {
  message: string | null | undefined;
  type?: ToastType;
}) {
  if (!message) return null;

  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    error:   'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400',
    info:    'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
  };

  const inlineIcons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" />,
    error:   <AlertCircle  className="w-3.5 h-3.5 shrink-0 mt-px" />,
    info:    <Info         className="w-3.5 h-3.5 shrink-0 mt-px" />,
  };

  return (
    <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-[13px] font-bold ${styles[type]}`}>
      {inlineIcons[type]}
      <span className="leading-snug font-semibold">{message}</span>
    </div>
  );
}
