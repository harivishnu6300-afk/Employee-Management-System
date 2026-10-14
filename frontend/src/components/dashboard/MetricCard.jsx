import React from 'react';

export default function MetricCard({ title, value, icon: Icon, change, trend = 'up', color = 'brand', subtitle }) {
  const colorStyles = {
    brand: {
      bg: 'bg-brand-50 text-brand-600',
      border: 'hover:border-brand-300'
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'hover:border-emerald-300'
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'hover:border-amber-300'
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'hover:border-rose-300'
    },
    sky: {
      bg: 'bg-sky-50 text-sky-600',
      border: 'hover:border-sky-300'
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      border: 'hover:border-purple-300'
    }
  };

  const currentTheme = colorStyles[color] || colorStyles.brand;

  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md ${currentTheme.border}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${currentTheme.bg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold tracking-tight text-slate-800">
          {value !== undefined && value !== null ? value : '-'}
        </h3>
        {change && (
          <span
            className={`text-xs font-semibold ${
              trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
