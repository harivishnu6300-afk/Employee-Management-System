import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  Clock,
  UserCheck,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Building
} from 'lucide-react';
import { attendanceService } from '../services/attendanceService';
import { departmentService } from '../services/departmentService';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

import CheckInWidget from '../components/attendance/CheckInWidget';
import MetricCard from '../components/dashboard/MetricCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function Attendance() {
  const { user, isAdmin, isHR, isManager, isEmployee } = useAuth();
  const { subscribe } = useSocket();
  const { showSuccess, showError } = useToast();

  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Manual Attendance Modal (Admin/HR)
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().slice(0, 10),
    checkIn: '',
    checkOut: '',
    status: 'Present',
    notes: 'Manual entry'
  });
  const [manualLoading, setManualLoading] = useState(false);

  // Summary counts for the selected date
  const summary = attendance.reduce(
    (acc, cur) => {
      if (cur.status === 'Present') acc.present++;
      else if (cur.status === 'Late') acc.late++;
      else if (cur.status === 'Half Day') acc.halfDay++;
      else if (cur.status === 'Absent') acc.absent++;
      else if (cur.status === 'Leave') acc.leave++;
      return acc;
    },
    { present: 0, late: 0, halfDay: 0, absent: 0, leave: 0 }
  );

  useEffect(() => {
    departmentService.getAll().then((res) => {
      if (res.success) setDepartments(res.departments || []);
    });
    if (isAdmin || isHR) {
      employeeService.getAll({ all: 'true' }).then((res) => {
        if (res.success) setEmployeeList(res.employees || []);
      });
    }
  }, [isAdmin, isHR]);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);

      if (isEmployee) {
        // Individual employee history
        const res = await attendanceService.getEmployeeHistory(user.employee_id, {
          limit: 30
        });
        if (res.success) {
          setAttendance(res.attendance || []);
          setPagination({ total: res.attendance?.length || 0, totalPages: 1 });
        }
      } else {
        // Admin / HR / Manager company overview
        const res = await attendanceService.getAll({
          date,
          department,
          status,
          search,
          page,
          limit
        });
        if (res.success) {
          setAttendance(res.attendance || []);
          setPagination(res.pagination || { total: 0, totalPages: 1 });
        }
      }
    } catch (err) {
      showError(err.message || 'Could not fetch attendance records.');
    } finally {
      setLoading(false);
    }
  }, [isEmployee, user?.employee_id, date, department, status, search, page, limit, showError]);

  useEffect(() => {
    fetchAttendance();

    // Real-time live update on check-in/out
    const unsub = subscribe('attendance', () => {
      fetchAttendance();
    });

    return () => unsub();
  }, [fetchAttendance, subscribe]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.employeeId || !manualForm.date || !manualForm.status) {
      showError('Please specify employee, date, and attendance status.');
      return;
    }

    setManualLoading(true);
    try {
      // Build ISO strings if time is given
      let checkInTimestamp = null;
      let checkOutTimestamp = null;

      if (manualForm.checkIn) {
        checkInTimestamp = `${manualForm.date} ${manualForm.checkIn}:00`;
      }
      if (manualForm.checkOut) {
        checkOutTimestamp = `${manualForm.date} ${manualForm.checkOut}:00`;
      }

      await attendanceService.manualRecord({
        ...manualForm,
        checkIn: checkInTimestamp,
        checkOut: checkOutTimestamp
      });
      showSuccess('Attendance record updated successfully.');
      setIsManualModalOpen(false);
      fetchAttendance();
    } catch (err) {
      showError(err.message || 'Failed to submit manual record.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Attendance Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time daily shifts, working hours verification, and attendance tracking.
          </p>
        </div>

        {(isAdmin || isHR) && (
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
          >
            <Plus className="h-4 w-4" />
            Manual Adjustment
          </button>
        )}
      </div>

      {/* Punch Clock Widget */}
      <CheckInWidget onAttendanceChange={fetchAttendance} />

      {/* Summary KPI Cards for company overview */}
      {!isEmployee && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Present On Time"
            value={summary.present}
            icon={UserCheck}
            color="emerald"
            subtitle="Full day present"
          />
          <MetricCard
            title="Late Check-ins"
            value={summary.late}
            icon={Clock}
            color="amber"
            subtitle="Checked in after 09:15"
          />
          <MetricCard
            title="Half Day"
            value={summary.halfDay}
            icon={AlertTriangle}
            color="purple"
            subtitle="Under 5 work hours"
          />
          <MetricCard
            title="Leaves / Away"
            value={summary.leave}
            icon={Calendar}
            color="sky"
            subtitle="Scheduled leaves"
          />
        </div>
      )}

      {/* Filters (For Admin / HR / Manager) */}
      {!isEmployee && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Date filter */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Attendance Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Search Employee
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Name or ID..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <Card
        title={isEmployee ? 'My Attendance History' : `Attendance Records for ${date}`}
        subtitle={
          isEmployee
            ? 'Track your daily check-ins, departures, and recorded shift hours'
            : 'Comprehensive organizational attendance register with automated work hour computation'
        }
      >
        {loading ? (
          <LoadingSpinner text="Retrieving attendance data..." />
        ) : attendance.length === 0 ? (
          <EmptyState
            title="No attendance records found"
            description="No check-ins registered for the selected date or employee."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Logged Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    {!isEmployee && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {row.avatar_url ? (
                            <img
                              src={row.avatar_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                              {(row.first_name || 'U')[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800">
                              {row.first_name} {row.last_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {row.employee_code} &bull; {row.department_name || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {new Date(row.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>

                    <td className="py-3 px-4">
                      {row.check_in ? (
                        <span className="font-mono font-medium text-slate-700">
                          {new Date(row.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {row.check_out ? (
                        <span className="font-mono font-medium text-slate-700">
                          {new Date(row.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-slate-400">In Progress</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {row.working_hours}h
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={row.status} size="sm">
                        {row.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {row.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Manual Attendance Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Manual Attendance Override"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleManualSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={manualForm.employeeId}
              onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Choose Employee...</option>
              {employeeList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={manualForm.date}
              onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Check In Time
              </label>
              <input
                type="time"
                value={manualForm.checkIn}
                onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Check Out Time
              </label>
              <input
                type="time"
                value={manualForm.checkOut}
                onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={manualForm.status}
              onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">On Leave</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Notes
            </label>
            <input
              type="text"
              value={manualForm.notes}
              onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
              placeholder="e.g. Field visit, System glitch corrected"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={manualLoading}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {manualLoading ? 'Saving...' : 'Save Attendance Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
