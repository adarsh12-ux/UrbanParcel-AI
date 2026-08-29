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
    cyan: 'bg-cyan-950/40 border-cyan-800/40 text-cyan-400 group-hover:border-cyan-500/60',
    emerald: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400 group-hover:border-emerald-500/60',
    indigo: 'bg-indigo-950/40 border-indigo-800/40 text-indigo-400 group-hover:border-indigo-500/60',
    amber: 'bg-amber-950/40 border-amber-800/40 text-amber-400 group-hover:border-amber-500/60'
  };

  return (
    <div className={`group relative overflow-hidden bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/50`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1 font-mono tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trendPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg border ${colorMap[color]} transition-colors duration-200`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
