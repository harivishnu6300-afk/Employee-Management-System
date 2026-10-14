import React from 'react';
import { Activity, User, Clock, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

export default function RecentActivityList({ activities = [] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        No recent activity records found
      </div>
    );
  }

  const getActionIcon = (action) => {
    if (action.includes('Login')) {
      return <User className="w-3.5 h-3.5 text-blue-500" />;
    } else if (action.includes('Leave') || action.includes('Approved')) {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    } else if (action.includes('Attendance') || action.includes('Check')) {
      return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    } else if (action.includes('Created') || action.includes('Updated')) {
      return <Activity className="w-3.5 h-3.5 text-purple-500" />;
    }
    return <Shield className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="divide-y divide-slate-100">
      {activities.map((item) => (
        <div key={item.id} className="py-3 flex items-start gap-3 text-xs">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            {getActionIcon(item.action)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800 truncate">{item.action}</p>
              <span className="text-[10px] text-slate-400 shrink-0">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] truncate mt-0.5">{item.details}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              By: {item.user_name || item.email || 'System'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
