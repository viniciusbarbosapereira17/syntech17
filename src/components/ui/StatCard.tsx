import React from 'react';
import { Card } from './Card.js';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
  };
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-blue-50 text-blue-600',
  badge,
  trend,
}) => {
  return (
    <Card id={id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={`p-2 rounded-lg shrink-0 ${iconBgColor}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
        {badge && (
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            badge.variant === 'success' ? 'bg-emerald-100 text-emerald-700' :
            badge.variant === 'danger' ? 'bg-rose-100 text-rose-700' :
            badge.variant === 'warning' ? 'bg-amber-100 text-amber-700' :
            badge.variant === 'info' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {badge.text}
          </span>
        )}
        {trend && (
          <span className="text-emerald-500 text-xs font-medium flex items-center gap-0.5">
            <span>↑</span> {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-400 font-medium">
          {subtitle}
        </p>
      )}
    </Card>
  );
};

