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
  const accentColors = {
    cyan: 'border-l-teal-700 bg-teal-50 text-teal-800',
    emerald: 'border-l-emerald-700 bg-emerald-50 text-emerald-800',
    indigo: 'border-l-slate-700 bg-slate-100 text-slate-800',
    amber: 'border-l-amber-700 bg-amber-50 text-amber-800'
  };

  const iconColors = {
    cyan: 'bg-teal-50 text-teal-700 border-teal-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    indigo: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-100'
  };

  return (
    <div className={`relative bg-white border border-slate-200 rounded p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] border-l-3 ${accentColors[color].split(' ')[0]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 leading-tight">{subtitle}</p>}
          {trend && (
            <p className={`text-[10px] font-mono mt-1.5 font-medium ${trendPositive ? 'text-emerald-700' : 'text-amber-700'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-2 rounded border shrink-0 ${iconColors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
