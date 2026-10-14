import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarCheck,
  CalendarDays,
  UserPlus,
  Building2,
  ArrowRight,
  TrendingUp,
  Activity,
  Sparkles,
  RefreshCw,
  BriefcaseBusiness,
  BadgeCheck,
  CalendarClock,
  CalendarX2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { dashboardService } from '../services/dashboardService';

import MetricCard from '../components/dashboard/MetricCard';
import DepartmentChart from '../components/dashboard/DepartmentChart';
import AttendanceTrendChart from '../components/dashboard/AttendanceTrendChart';
import LeaveStatusChart from '../components/dashboard/LeaveStatusChart';
import GrowthChart from '../components/dashboard/GrowthChart';
import RecentActivityList from '../components/dashboard/RecentActivityList';
import CheckInWidget from '../components/attendance/CheckInWidget';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Dashboard() {
  const { user, isAdmin, isHR, isManager, isEmployee } = useAuth();
  const { subscribe } = useSocket();

  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await dashboardService.getStats();
      if (res.success) {
        setStatsData(res);
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time events to auto-refresh dashboard
    const unsubDashboard = subscribe('dashboard', () => {
      fetchDashboardData();
    });
    const unsubAttendance = subscribe('attendance', () => {
      fetchDashboardData();
    });
    const unsubLeave = subscribe('leave', () => {
      fetchDashboardData();
    });

    return () => {
      unsubDashboard();
      unsubAttendance();
      unsubLeave();
    };
  }, [fetchDashboardData, subscribe]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <LoadingSpinner text="Compiling organizational intelligence..." size="lg" />;
  }

  const stats = statsData?.stats || {};
  const charts = statsData?.charts || {};
  const recentActivities = statsData?.recentActivities || [];
  const recentLeaves = statsData?.recentLeaves || [];
  const myMetrics = statsData?.myMetrics;
  const myLeave = myMetrics?.leaveSummary || {};
  const allowanceDays = Number(myLeave.allowance_days ?? 24);
  const daysTaken = Number(myLeave.days_taken || 0);
  const daysRemaining = Math.max(0, allowanceDays - daysTaken);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            Welcome back, {user?.first_name || 'Team Member'}!
            <span className="text-xl">👋</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time workforce metrics, attendance status, and team operations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            Refresh Data
          </button>

          {(isAdmin || isHR) && (
            <Link
              to="/employees?action=add"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-xs font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-700 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Employee
            </Link>
          )}

          <Link
            to="/leaves?action=apply"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <CalendarDays className="w-3.5 h-3.5 text-brand-600" />
            Apply Leave
          </Link>
        </div>
      </div>

      {isEmployee && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-indigo-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-sm">
                {(user?.first_name || 'E').slice(0, 1)}{(user?.last_name || '').slice(0, 1)}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Your employee profile</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">{user?.first_name || 'Team'} {user?.last_name || 'Member'}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>{user?.employee_code || (user?.employee_id ? `EMP-${user.employee_id}` : 'Employee ID not assigned')}</span>
                  <span className="hidden text-slate-300 sm:inline">•</span>
                  <span>{user?.department_name || 'Department not assigned'}</span>
                  <span className="hidden text-slate-300 sm:inline">•</span>
                  <span>{user?.designation || 'Designation not assigned'}</span>
                </div>
              </div>
            </div>
            <Link to="/leaves?action=apply" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700">
              <CalendarDays className="h-4 w-4" /> Request time off
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            <div className="p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><CalendarClock className="h-4 w-4 text-amber-600" /> Pending</div><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{Number(myLeave.pending || 0)}</p><p className="mt-1 text-[11px] text-slate-500">Awaiting review</p></div>
            <div className="p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><BadgeCheck className="h-4 w-4 text-emerald-600" /> Approved</div><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{Number(myLeave.approved || 0)}</p><p className="mt-1 text-[11px] text-slate-500">Requests this year</p></div>
            <div className="p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><CalendarX2 className="h-4 w-4 text-rose-600" /> Rejected</div><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{Number(myLeave.rejected || 0)}</p><p className="mt-1 text-[11px] text-slate-500">Requests this year</p></div>
            <div className="p-4 sm:p-5"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><BriefcaseBusiness className="h-4 w-4 text-indigo-600" /> Leave balance</div><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{daysRemaining}<span className="ml-1 text-sm font-medium text-slate-400">/ {allowanceDays} days</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${allowanceDays > 0 ? Math.min(100, (daysTaken / allowanceDays) * 100) : 0}%` }} /></div><p className="mt-1 text-[11px] text-slate-500">{daysTaken} approved day(s) used</p></div>
          </div>
        </section>
      )}

      {/* Real-time Punch Clock Widget */}
      <CheckInWidget onAttendanceChange={fetchDashboardData} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Headcount"
          value={stats.totalEmployees}
          icon={Users}
          color="brand"
          subtitle={`${stats.activeEmployees} currently active`}
        />
        <MetricCard
          title="Present Today"
          value={stats.presentToday + stats.lateToday}
          icon={CalendarCheck}
          color="emerald"
          subtitle={`${stats.lateToday} check-in(s) late`}
        />
        <MetricCard
          title="Absent Today"
          value={stats.absentToday}
          icon={UserX}
          color="rose"
          subtitle="Not checked in yet"
        />
        <MetricCard
          title="On Leave"
          value={stats.onLeaveEmployees}
          icon={Clock}
          color="amber"
          subtitle={`${stats.pendingLeaves} pending approvals`}
        />
      </div>

      {/* Charts Section 1: Department Staffing & Attendance Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Department Distribution"
          subtitle="Active workforce distribution across departments"
          action={
            <Link to="/departments" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <DepartmentChart data={charts.departmentDistribution} />
        </Card>

        <Card
          title="Attendance Trend (Past 7 Days)"
          subtitle="Daily punctuality and present staff volume"
          action={
            <Link to="/attendance" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
              View history <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <AttendanceTrendChart data={charts.attendanceTrend} />
        </Card>
      </div>

      {/* Charts Section 2: Leave Breakdown & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          title="Leave Requests"
          subtitle="Applications distribution by status"
          action={
            <Link to="/leaves" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
              Manage <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <LeaveStatusChart data={charts.leaveStats} />
        </Card>

        <Card
          title="Monthly Talent Growth"
          subtitle="New additions over past 6 months"
          className="lg:col-span-2"
        >
          <GrowthChart data={charts.monthlyGrowth} />
        </Card>
      </div>

      {/* Bottom Grids: Recent Activity & Recent Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending & Recent Leaves */}
        <Card
          title="Recent Leave Applications"
          subtitle="Latest submitted employee leave requests"
          action={
            <Link to="/leaves" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
              All requests <ArrowRight className="w-3 h-3" />
            </Link>
          }
        >
          <div className="divide-y divide-slate-100">
            {recentLeaves.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent leave requests</p>
            ) : (
              recentLeaves.map((leave) => (
                <div key={leave.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {leave.avatar_url ? (
                      <img
                        src={leave.avatar_url}
                        alt={leave.first_name}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold">
                        {(leave.first_name || 'U')[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {leave.first_name} {leave.last_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {leave.leave_type} &bull; {leave.total_days} day(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={leave.status} size="sm">
                      {leave.status}
                    </Badge>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(leave.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Real-time Activity Logs Feed */}
        <Card
          title="System Audit & Activity Feed"
          subtitle="Audit trails and real-time operational events"
          action={
            isAdmin ? (
              <Link to="/settings" className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1">
                Full logs <ArrowRight className="w-3 h-3" />
              </Link>
            ) : null
          }
        >
          <RecentActivityList activities={recentActivities} />
        </Card>
      </div>
    </div>
  );
}
