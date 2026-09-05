import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const bgMap = {
    success: 'bg-white border-emerald-200 text-slate-900 shadow-lg',
    error: 'bg-white border-rose-200 text-slate-900 shadow-lg',
    info: 'bg-white border-slate-200 text-slate-900 shadow-lg'
  };

  const iconColorMap = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    info: 'text-teal-700'
  };

  const IconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  };

  const Icon = IconMap[toast.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm">
      <div className={`flex items-start gap-3 p-3.5 rounded border ${bgMap[toast.type]}`}>
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColorMap[toast.type]}`} />
        <div className="flex-1 text-xs">
          <p className="font-semibold text-slate-900">{toast.title}</p>
          {toast.description && <p className="text-[11px] text-slate-500 mt-0.5">{toast.description}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
