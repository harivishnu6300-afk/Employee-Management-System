import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Building, Briefcase, Calendar, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react';
import Badge from '../common/Badge';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeCard({ employee, onEdit, onDelete }) {
  const { isEmployeeOnline, getEmployeeStatus } = useSocket();
  const { isAdmin, isHR } = useAuth();

  const isOnline = isEmployeeOnline(employee.id);
  const liveStatus = getEmployeeStatus(employee.id);

  return (
    <div className="group relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Top Row: Avatar with Live Badge & Status */}
      <div className="flex items-start justify-between">
        <div className="relative">
          {employee.avatar_url ? (
            <img
              src={employee.avatar_url}
              alt={`${employee.first_name} ${employee.last_name}`}
              className="h-14 w-14 rounded-2xl object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-lg font-bold text-white shadow-sm">
              {employee.first_name[0]}
              {employee.last_name ? employee.last_name[0] : ''}
            </div>
          )}

          {/* Real-time Socket Online Indicator */}
          <span
            className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${
              liveStatus === 'Online'
                ? 'bg-emerald-500'
                : liveStatus === 'Away'
                ? 'bg-amber-500'
                : 'bg-slate-300'
            }`}
            title={`Status: ${liveStatus}`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant={employee.status} size="sm">
            {employee.status}
          </Badge>

          {/* Live presence pill */}
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              liveStatus === 'Online'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : liveStatus === 'Away'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            {liveStatus}
          </span>
        </div>
      </div>

      {/* Name and Designation */}
      <div className="mt-3.5">
        <Link
          to={`/employees/${employee.id}`}
          className="font-bold text-slate-800 text-base hover:text-brand-600 transition block truncate"
        >
          {employee.first_name} {employee.last_name}
        </Link>
        <p className="text-xs font-medium text-brand-600 truncate">{employee.designation}</p>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{employee.employee_code}</p>
      </div>

      {/* Details List */}
      <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <div className="flex items-center gap-2 truncate">
          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{employee.department_name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{employee.email}</span>
        </div>
        {employee.phone && (
          <div className="flex items-center gap-2 truncate">
            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{employee.phone}</span>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <Link
          to={`/employees/${employee.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          <Eye className="w-3.5 h-3.5" /> View Profile
        </Link>

        {(isAdmin || isHR) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(employee)}
              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
              title="Edit Employee"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(employee)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Deactivate / Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
