import React from 'react';
import { ProjectStatus } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus | 'Verified' | 'Flagged' | 'Pending Review';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status) {
    case 'Completed':
    case 'Verified':
      colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 shadow-xs shadow-emerald-900/30';
      break;
    case 'Processing':
    case 'Pending Review':
      colorClasses = 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60 animate-pulse';
      break;
    case 'Draft':
      colorClasses = 'bg-slate-800 text-slate-400 border-slate-700';
      break;
    case 'Failed':
    case 'Flagged':
      colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-800/60';
      break;
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'Completed' || status === 'Verified' ? 'bg-emerald-400' :
        status === 'Processing' || status === 'Pending Review' ? 'bg-cyan-400' :
        status === 'Failed' || status === 'Flagged' ? 'bg-amber-400' : 'bg-slate-400'
      }`}></span>
      {status}
    </span>
  );
};
