import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Check,
  X,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { leaveService } from '../services/leaveService';
import { departmentService } from '../services/departmentService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import MetricCard from '../components/dashboard/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

export default function Leaves() {
  const { user, isAdmin, isHR, isManager, isEmployee } = useAuth();
  const { subscribe } = useSocket();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [calculatedDays, setCalculatedDays] = useState(1);
  const [applyLoading, setApplyLoading] = useState(false);

  // Review Modal (Manager / HR / Admin)
  const [reviewLeave, setReviewLeave] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Check URL query action=apply
  useEffect(() => {
    if (searchParams.get('action') === 'apply') {
      setIsApplyModalOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Recalculate days when dates change
  useEffect(() => {
    if (applyForm.startDate && applyForm.endDate) {
      const s = new Date(applyForm.startDate);
      const e = new Date(applyForm.endDate);
      if (e >= s) {
        const diff = Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1;
        setCalculatedDays(diff);
      } else {
        setCalculatedDays(0);
      }
    }
  }, [applyForm.startDate, applyForm.endDate]);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leaveService.getAll({
        status: statusFilter,
        leaveType: typeFilter,
        search
      });
      if (res.success) {
        setLeaves(res.leaves || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search, showError]);

  useEffect(() => {
    fetchLeaves();

    // Real-time leave status listener
    const unsub = subscribe('leave', () => {
      fetchLeaves();
    });

    return () => unsub();
  }, [fetchLeaves, subscribe]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      showError('Please fill in dates and reason.');
      return;
    }

    if (calculatedDays <= 0) {
      showError('Start date cannot be after end date.');
      return;
    }

    setApplyLoading(true);
    try {
      const res = await leaveService.apply(applyForm);
      showSuccess(res.message || 'Leave request submitted successfully.');
      setIsApplyModalOpen(false);
      setApplyForm({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      showError(err.message || 'Failed to submit leave request.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!reviewLeave) return;
    setReviewLoading(true);
    try {
      await leaveService.approve(reviewLeave.id, reviewRemarks);
      showSuccess(`Leave request approved for ${reviewLeave.first_name}!`);
      setReviewLeave(null);
      setReviewRemarks('');
      fetchLeaves();
    } catch (err) {
      showError(err.message || 'Failed to approve leave request.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reviewLeave) return;
    if (!reviewRemarks.trim()) {
      showError('Please provide remarks or reason for rejection.');
      return;
    }
    setReviewLoading(true);
    try {
      await leaveService.reject(reviewLeave.id, reviewRemarks);
      showSuccess(`Leave request rejected.`);
      setReviewLeave(null);
      setReviewRemarks('');
      fetchLeaves();
    } catch (err) {
      showError(err.message || 'Failed to reject leave request.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Leave metrics
  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'Rejected').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Leave Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Apply for paid time off, track approvals, and review staff leave balances.
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition"
        >
          <Plus className="h-4 w-4" />
          Apply for Leave
        </button>
      </div>

      {/* KPI Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Pending Approval"
          value={pendingCount}
          icon={Clock}
          color="amber"
          subtitle="Awaiting management action"
        />
        <MetricCard
          title="Approved Leaves"
          value={approvedCount}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Scheduled time off granted"
        />
        <MetricCard
          title="Rejected Requests"
          value={rejectedCount}
          icon={XCircle}
          color="rose"
          subtitle="Denied with manager remarks"
        />
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name, code, or reason..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-800 focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Leave Types</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Earned Leave">Earned Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <Card
        title="Leave Applications Registry"
        subtitle="Chronological list of all team leave applications and approvals"
      >
        {loading ? (
          <LoadingSpinner text="Retrieving leave records..." />
        ) : leaves.length === 0 ? (
          <EmptyState
            title="No leave requests found"
            description="No applications match the current criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  {!isEmployee && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Reviewer Remarks</th>
                  {(isAdmin || isHR || isManager) && (
                    <th className="py-3 px-4 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50 transition">
                    {!isEmployee && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {leave.avatar_url ? (
                            <img
                              src={leave.avatar_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                              {(leave.first_name || 'U')[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800">
                              {leave.first_name} {leave.last_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {leave.employee_code} &bull; {leave.department_name || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {leave.leave_type}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {new Date(leave.start_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}{' '}
                      -{' '}
                      {new Date(leave.end_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">
                      {leave.total_days} day(s)
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={leave.status} size="sm">
                        {leave.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                      {leave.reason}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                      {leave.action_remarks || (leave.status === 'Pending' ? 'Under Review' : '-')}
                    </td>

                    {(isAdmin || isHR || isManager) && (
                      <td className="py-3 px-4 text-right">
                        {leave.status === 'Pending' ? (
                          <button
                            onClick={() => {
                              setReviewLeave(leave);
                              setReviewRemarks('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Review
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Leave Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={applyForm.leaveType}
              onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              <option value="Casual Leave">Casual Leave (Short personal errands)</option>
              <option value="Sick Leave">Sick Leave (Medical ailment or recovery)</option>
              <option value="Earned Leave">Earned Leave (Scheduled annual vacation)</option>
              <option value="Emergency Leave">Emergency Leave (Immediate domestic urgency)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={applyForm.startDate}
                onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={applyForm.endDate}
                onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {applyForm.startDate && applyForm.endDate && (
            <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-100 flex items-center justify-between text-xs">
              <span className="text-brand-800 font-medium">Computed Total Days:</span>
              <span className="font-bold text-brand-900 text-sm">{calculatedDays} day(s)</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Leave <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="State the purpose of your leave request clearly for management approval..."
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={applyLoading}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {applyLoading ? 'Submitting...' : 'Submit Leave Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manager / HR Review Modal */}
      {reviewLeave && (
        <Modal
          isOpen={!!reviewLeave}
          onClose={() => setReviewLeave(null)}
          title={`Review Leave: ${reviewLeave.first_name} ${reviewLeave.last_name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Leave Type:</span>
                <span className="font-semibold text-slate-800">{reviewLeave.leave_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Period:</span>
                <span className="font-semibold text-slate-800">
                  {reviewLeave.start_date} to {reviewLeave.end_date} ({reviewLeave.total_days} days)
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2">
                <span className="text-slate-500 block mb-0.5">Employee Reason:</span>
                <p className="text-slate-800 italic bg-white p-2 rounded-lg border border-slate-100">
                  "{reviewLeave.reason}"
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approval / Rejection Remarks
              </label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Add comments or instructions (Required for rejections)..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleReject}
                disabled={reviewLoading}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" /> Reject Request
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={reviewLoading}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Approve Request
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
