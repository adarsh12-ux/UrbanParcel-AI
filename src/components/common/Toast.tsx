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
    success: 'bg-slate-900 border-emerald-500/50 text-emerald-300',
    error: 'bg-slate-900 border-rose-500/50 text-rose-300',
    info: 'bg-slate-900 border-cyan-500/50 text-cyan-300'
  };

  const IconMap = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  };

  const Icon = IconMap[toast.type];

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm animate-bounce-short">
      <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl ${bgMap[toast.type]} backdrop-blur-md`}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-slate-100">{toast.title}</p>
          {toast.description && <p className="text-xs text-slate-400 mt-0.5">{toast.description}</p>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
