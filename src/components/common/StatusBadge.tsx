import React from 'react';
import { ProjectStatus } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus | 'Verified' | 'Flagged' | 'Pending Review';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs';

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  switch (status) {
    case 'Completed':
    case 'Verified':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      dotColor = 'bg-emerald-600';
      break;
    case 'Processing':
    case 'Pending Review':
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
      dotColor = 'bg-teal-600';
      break;
    case 'Draft':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
      break;
    case 'Failed':
    case 'Flagged':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      dotColor = 'bg-amber-600';
      break;
  }

  return (
    <span className={`inline-flex items-center font-medium rounded border ${sizeClasses} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`}></span>
      {status}
    </span>
  );
};
