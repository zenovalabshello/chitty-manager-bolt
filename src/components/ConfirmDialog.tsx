import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-soft-lg animate-scale-in dark:bg-neutral-900 sm:rounded-2xl sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              destructive
                ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                : 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all active:scale-[0.98] ${
              destructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
