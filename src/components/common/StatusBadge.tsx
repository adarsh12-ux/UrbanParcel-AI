import React from 'react';
import { ProjectStatus } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus | 'Verified' | 'Flagged' | 'Pending Review';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  let colorClasses = 'bg-canvas text-muted border-line';

  switch (status) {
    case 'Completed':
    case 'Verified':
      colorClasses = 'bg-forest-50 text-forest-800 border-forest-100';
      break;
    case 'Processing':
    case 'Pending Review':
      colorClasses = 'bg-navy-50 text-navy-800 border-navy-100';
      break;
    case 'Draft':
      colorClasses = 'bg-canvas text-muted border-line';
      break;
    case 'Failed':
    case 'Flagged':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      break;
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-sm border ${sizeClasses} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'Completed' || status === 'Verified' ? 'bg-forest-700' :
        status === 'Processing' || status === 'Pending Review' ? 'bg-navy-600' :
        status === 'Failed' || status === 'Flagged' ? 'bg-amber-600' : 'bg-slate-400'
      }`}></span>
      {status}
    </span>
  );
};
