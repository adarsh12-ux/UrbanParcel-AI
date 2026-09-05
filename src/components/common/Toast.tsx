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
    success: 'bg-white border-forest-100 text-forest-800 shadow-md',
    error: 'bg-white border-rose-200 text-rose-900 shadow-md',
    info: 'bg-white border-line text-ink shadow-md'
  };

  const iconColorMap = {
    success: 'text-forest-700',
    error: 'text-rose-700',
    info: 'text-navy-700'
  };

  const IconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  };

  const Icon = IconMap[toast.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm">
      <div className={`flex items-start gap-3 p-4 rounded-sm border ${bgMap[toast.type]}`}>
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColorMap[toast.type]}`} />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-ink">{toast.title}</p>
          {toast.description && <p className="text-xs text-muted mt-0.5">{toast.description}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-ink p-1 rounded-sm"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
