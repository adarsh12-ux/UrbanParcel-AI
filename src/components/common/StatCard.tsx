import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  color?: 'cyan' | 'emerald' | 'indigo' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  color = 'cyan'
}) => {
  const colorMap = {
    cyan: 'bg-navy-50 border-navy-100 text-navy-800',
    emerald: 'bg-forest-50 border-forest-100 text-forest-800',
    indigo: 'bg-navy-50 border-navy-100 text-navy-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-800'
  };

  return (
    <div className="relative bg-white border border-line rounded-sm p-5 shadow-[0_1px_2px_rgba(12,35,64,0.04)]">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-navy-900" />
      <div className="flex items-center justify-between pl-1">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-ink mt-1 font-mono tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trendPositive ? 'text-forest-700' : 'text-amber-700'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-sm border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
