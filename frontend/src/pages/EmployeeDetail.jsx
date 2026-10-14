import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  MapPin,
  Shield,
  Clock,
  Camera,
  Edit2,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Activity,
  FileText
} from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';

import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AddEmployeeModal from '../components/employees/AddEmployeeModal';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, isAdmin, isHR, refreshUser } = useAuth();
  const { getEmployeeStatus } = useSocket();
  const { showSuccess, showError } = useToast();

  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('personal'); // personal | employment | attendance | leaves | activity

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef(null);

  const isSelf = currentUser?.employee_id === parseInt(id, 10);
  const canEdit = isAdmin || isHR || isSelf;

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const res = await employeeService.getById(id);
      if (res.success) {
        setEmployeeData(res);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch employee details.');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const res = await employeeService.uploadAvatar(id, file);
      showSuccess('Profile photo updated successfully.');
      setEmployeeData((prev) => ({
        ...prev,
        employee: { ...prev.employee, avatar_url: res.avatarUrl }
      }));
      if (isSelf) refreshUser();
    } catch (err) {
      showError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authService.changePassword(passwordForm);
      showSuccess(res.message || 'Password changed successfully.');
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showError(err.message || 'Could not change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading employee profile..." size="lg" />;
  }

  const emp = employeeData?.employee || {};
  const attendanceList = employeeData?.attendance || [];
  const leaveList = employeeData?.leaves || [];
  const activityLogs = employeeData?.activityLogs || [];
  const stats = employeeData?.stats || {};
  const liveStatus = getEmployeeStatus(emp.id);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Employee Directory
        </Link>
      </div>

      {/* Profile Header Hero Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Upload button */}
            <div className="relative group shrink-0">
              {emp.avatar_url ? (
                <img
                  src={emp.avatar_url}
                  alt={`${emp.first_name} ${emp.last_name}`}
                  className="h-24 w-24 rounded-2xl object-cover ring-4 ring-slate-100 shadow-xs"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-2xl font-bold text-white shadow-md">
                  {emp.first_name[0]}
                  {emp.last_name ? emp.last_name[0] : ''}
                </div>
              )}

              {/* Real-time Socket Indicator */}
              <span
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full ring-2 ring-white ${
                  liveStatus === 'Online'
                    ? 'bg-emerald-500'
                    : liveStatus === 'Away'
                    ? 'bg-amber-500'
                    : 'bg-slate-300'
                }`}
                title={`Presence: ${liveStatus}`}
              />

              {/* Photo Upload trigger button */}
              {canEdit && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 transition duration-200"
                    title="Change Photo"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Basic Info */}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                  {emp.first_name} {emp.last_name}
                </h2>
                <Badge variant={emp.status}>{emp.status}</Badge>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
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

              <p className="text-sm font-semibold text-brand-600 mt-0.5">
                {emp.designation} &bull; {emp.department_name || 'General Staff'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-3">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                  {emp.employee_code}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {emp.email}
                </span>
                {emp.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {emp.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Joined {new Date(emp.joining_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-brand-600" />
                Edit Profile
              </button>
            )}

            {isSelf && (
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5 text-brand-600" />
                Change Password
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex border-b border-slate-100 space-x-6 text-xs font-semibold overflow-x-auto">
          {[
            { key: 'personal', label: 'Personal Information' },
            { key: 'employment', label: 'Employment Details' },
            { key: 'attendance', label: `Attendance Log (${attendanceList.length})` },
            { key: 'leaves', label: `Leave Records (${leaveList.length})` },
            { key: 'activity', label: `Audit Trails (${activityLogs.length})` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 border-b-2 transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Personal Information */}
      {activeTab === 'personal' && (
        <Card title="Personal Details" subtitle="Employee contact and background information">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Full Legal Name</span>
              <p className="font-semibold text-slate-800 text-sm">
                {emp.first_name} {emp.last_name}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Email Address</span>
              <p className="font-semibold text-slate-800 text-sm">{emp.email}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Phone Number</span>
              <p className="font-semibold text-slate-800 text-sm">{emp.phone || 'Not provided'}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Date of Birth</span>
              <p className="font-semibold text-slate-800 text-sm">
                {emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : 'Not provided'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Gender</span>
              <p className="font-semibold text-slate-800 text-sm">{emp.gender || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Emergency Contact</span>
              <p className="font-semibold text-slate-800 text-sm">
                {emp.emergency_contact || 'None registered'}
              </p>
            </div>
            <div className="sm:col-span-2 md:col-span-3 border-t border-slate-100 pt-4">
              <span className="text-slate-400 block mb-1">Residential Address</span>
              <p className="font-semibold text-slate-800 text-sm">
                {emp.address
                  ? `${emp.address}, ${emp.city || ''} ${emp.state || ''}`
                  : 'Address not recorded'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: Employment Information */}
      {activeTab === 'employment' && (
        <Card title="Corporate Employment Information" subtitle="Job role, compensation, and management hierarchy">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Employee Code</span>
              <p className="font-mono font-bold text-slate-800 text-sm">{emp.employee_code}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Assigned Department</span>
              <p className="font-semibold text-slate-800 text-sm">
                {emp.department_name || 'Unassigned'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Official Designation</span>
              <p className="font-semibold text-slate-800 text-sm">{emp.designation}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Portal Access Role</span>
              <p className="font-semibold text-slate-800 text-sm">{emp.role_name}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Employment Type</span>
              <p className="font-semibold text-slate-800 text-sm">{emp.employment_type}</p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Reporting Manager</span>
              <p className="font-semibold text-slate-800 text-sm">
                {emp.manager_name || 'Independent / Executive'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Date of Joining</span>
              <p className="font-semibold text-slate-800 text-sm">
                {new Date(emp.joining_date).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            {(isAdmin || isHR) && (
              <div>
                <span className="text-slate-400 block mb-1">Annual Compensation</span>
                <p className="font-semibold text-emerald-700 text-base">
                  ${parseFloat(emp.salary || 0).toLocaleString()} / year
                </p>
              </div>
            )}
            <div>
              <span className="text-slate-400 block mb-1">Account Status</span>
              <Badge variant={emp.status}>{emp.status}</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: Attendance */}
      {activeTab === 'attendance' && (
        <Card title="Attendance Record History" subtitle="Recent check-in timestamps and calculated hours">
          {attendanceList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No attendance records on file</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Check In</th>
                    <th className="py-2.5 px-3">Check Out</th>
                    <th className="py-2.5 px-3">Logged Hours</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceList.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {new Date(att.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        {att.check_in
                          ? new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {att.check_out
                          ? new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                        {att.working_hours}h
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={att.status} size="sm">
                          {att.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{att.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: Leave History */}
      {activeTab === 'leaves' && (
        <Card title="Leave Applications & History" subtitle="Submitted leave requests and approval records">
          {leaveList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No leave requests recorded</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Leave Type</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3">End Date</th>
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Review Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveList.map((leave) => (
                    <tr key={leave.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {leave.leave_type}
                      </td>
                      <td className="py-2.5 px-3">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {new Date(leave.end_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">
                        {leave.total_days}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={leave.status} size="sm">
                          {leave.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate">{leave.reason}</td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {leave.action_remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 5: Activity History */}
      {activeTab === 'activity' && (
        <Card title="Activity & Security Logs" subtitle="Audit records and security events for this user">
          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No audit trail records found</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activityLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{log.action}</p>
                    <p className="text-slate-500 mt-0.5">{log.details}</p>
                    {log.ip_address && (
                      <p className="text-[10px] text-slate-400 mt-0.5">IP: {log.ip_address}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Edit Profile Modal */}
      <AddEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employeeToEdit={emp}
        onSuccess={() => {
          fetchEmployeeData();
          if (isSelf) refreshUser();
        }}
      />

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Account Password"
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, newPassword: e.target.value })
              }
              placeholder="Min 6 characters"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
