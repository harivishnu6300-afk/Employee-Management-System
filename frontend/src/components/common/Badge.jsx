import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',

    // Specific domain presets
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    Terminated: 'bg-rose-50 text-rose-700 border-rose-200',
    'On Leave': 'bg-amber-50 text-amber-700 border-amber-200',

    Present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Late: 'bg-amber-50 text-amber-700 border-amber-200',
    'Half Day': 'bg-purple-50 text-purple-700 border-purple-200',
    Absent: 'bg-rose-50 text-rose-700 border-rose-200',
    Leave: 'bg-blue-50 text-blue-700 border-blue-200',

    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-200',

    Online: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    Away: 'bg-amber-500/10 text-amber-600 border-amber-200',
    Offline: 'bg-slate-100 text-slate-500 border-slate-200'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  const style = variants[variant] || variants.default;
  const sz = sizes[size] || sizes.md;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style} ${sz} ${className}`}>
      {children}
    </span>
  );
}
