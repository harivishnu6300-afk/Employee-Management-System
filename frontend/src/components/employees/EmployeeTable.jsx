import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit2, Trash2, Mail, Phone } from 'lucide-react';
import Badge from '../common/Badge';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeTable({ employees = [], onEdit, onDelete }) {
  const { getEmployeeStatus } = useSocket();
  const { isAdmin, isHR } = useAuth();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <table className="w-full text-left text-xs text-slate-600">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-3.5">Employee</th>
            <th className="px-5 py-3.5">Code</th>
            <th className="px-5 py-3.5">Department</th>
            <th className="px-5 py-3.5">Designation</th>
            <th className="px-5 py-3.5">Presence</th>
            <th className="px-5 py-3.5">Status</th>
            <th className="px-5 py-3.5">Joined</th>
            {(isAdmin || isHR) && <th className="px-5 py-3.5 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {employees.map((emp) => {
            const liveStatus = getEmployeeStatus(emp.id);

            return (
              <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                {/* Employee Name & Avatar */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      {emp.avatar_url ? (
                        <img
                          src={emp.avatar_url}
                          alt={emp.first_name}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {emp.first_name[0]}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                          liveStatus === 'Online'
                            ? 'bg-emerald-500'
                            : liveStatus === 'Away'
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <Link
                        to={`/employees/${emp.id}`}
                        className="font-semibold text-slate-800 hover:text-brand-600 transition truncate block"
                      >
                        {emp.first_name} {emp.last_name}
                      </Link>
                      <p className="text-[11px] text-slate-400 truncate">{emp.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600">
                  {emp.employee_code}
                </td>

                <td className="px-5 py-3.5">
                  <span className="font-medium text-slate-700">
                    {emp.department_name || 'Unassigned'}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-slate-600">{emp.designation}</td>

                {/* Real-time Presence */}
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      liveStatus === 'Online'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : liveStatus === 'Away'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        liveStatus === 'Online'
                          ? 'bg-emerald-500'
                          : liveStatus === 'Away'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    {liveStatus}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-3.5">
                  <Badge variant={emp.status} size="sm">
                    {emp.status}
                  </Badge>
                </td>

                <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                  {emp.joining_date
                    ? new Date(emp.joining_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : '-'}
                </td>

                {/* Actions */}
                {(isAdmin || isHR) && (
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/employees/${emp.id}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition"
                        title="View Profile"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => onEdit(emp)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition"
                        title="Edit Details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(emp)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Deactivate / Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
