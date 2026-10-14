import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { useToast } from '../../context/ToastContext';
import Badge from '../common/Badge';

export default function CheckInWidget({ onAttendanceChange }) {
  const { showSuccess, showError } = useToast();
  const [todayStatus, setTodayStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(false);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const data = await attendanceService.getTodayStatus();
      if (data.success) {
        setTodayStatus(data.attendance);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceService.checkIn();
      showSuccess(res.message || 'Checked in successfully!');
      setTodayStatus(res.attendance);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      showError(err.message || 'Failed to check in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceService.checkOut();
      showSuccess(res.message || 'Checked out successfully!');
      setTodayStatus(res.attendance);
      if (onAttendanceChange) onAttendanceChange();
    } catch (err) {
      showError(err.message || 'Failed to check out.');
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = !!(todayStatus && todayStatus.check_in);
  const isCheckedOut = !!(todayStatus && todayStatus.check_out);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-500 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Attendance Punch Clock
            </h4>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Action Button & Status pill */}
        <div className="flex flex-wrap items-center gap-3">
          {isCheckedIn && (
            <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500">In:</span>
              <span className="font-semibold text-slate-800">
                {new Date(todayStatus.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <Badge variant={todayStatus.status} size="sm">
                {todayStatus.status}
              </Badge>
            </div>
          )}

          {isCheckedOut && (
            <div className="flex items-center gap-2 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500">Hours:</span>
              <span className="font-bold text-emerald-700 font-mono">
                {todayStatus.working_hours}h
              </span>
            </div>
          )}

          {!isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading || loading}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Check In Today
            </button>
          ) : !isCheckedOut ? (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Check Out Shift
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Shift Completed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
