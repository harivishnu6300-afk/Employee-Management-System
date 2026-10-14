import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Key,
  Users,
  Activity,
  Save,
  CheckCircle2,
  Lock,
  Search,
  Building
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState(isAdmin ? 'system' : 'security'); // system | users | logs | security

  // Security Form
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [securityLoading, setSecurityLoading] = useState(false);

  // System Settings State (Admin)
  const [systemSettings, setSystemSettings] = useState({
    company_name: '',
    work_start_time: '09:00',
    work_end_time: '18:00',
    grace_period_minutes: '15',
    standard_work_hours: '8.0',
    support_email: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Users Management State (Admin)
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Audit Logs State (Admin)
  const [logsList, setLogsList] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Fetch admin settings & users if admin
  useEffect(() => {
    if (isAdmin) {
      adminService.getSettings().then((res) => {
        if (res.success && res.settings) {
          setSystemSettings((prev) => ({ ...prev, ...res.settings }));
        }
      });
      fetchAdminUsers();
      fetchAuditLogs();
    }
  }, [isAdmin]);

  const fetchAdminUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminService.getUsers();
      if (res.success) setUsersList(res.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAuditLogs = async (search = '') => {
    setLogsLoading(true);
    try {
      const res = await adminService.getActivityLogs({ search, limit: 50 });
      if (res.success) setLogsList(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      showError('New passwords do not match.');
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await authService.changePassword(securityForm);
      showSuccess(res.message || 'Password updated successfully.');
      setSecurityForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showError(err.message || 'Failed to change password.');
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      await adminService.updateSettings(systemSettings);
      showSuccess('System parameters successfully saved to MySQL.');
    } catch (err) {
      showError(err.message || 'Failed to save settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleRoleChange = async (targetUserId, roleId) => {
    try {
      await adminService.updateUserRole(targetUserId, roleId);
      showSuccess('User access role updated.');
      fetchAdminUsers();
    } catch (err) {
      showError(err.message || 'Failed to change user role.');
    }
  };

  const handleToggleUserStatus = async (targetUserId, currentStatus) => {
    try {
      await adminService.toggleUserStatus(targetUserId, !currentStatus);
      showSuccess('User status updated.');
      fetchAdminUsers();
    } catch (err) {
      showError(err.message || 'Failed to update user status.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">
          Settings & Administration
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure organization rules, security credentials, user roles, and audit trails.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-semibold overflow-x-auto">
        {isAdmin && (
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" /> System Parameters
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Portal User Roles ({usersList.length})
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" /> Audit Activity Logs
          </button>
        )}

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Key className="w-4 h-4" /> My Account Security
        </button>
      </div>

      {/* TAB 1: System Parameters (Admin) */}
      {isAdmin && activeTab === 'system' && (
        <Card
          title="Organization Configuration"
          subtitle="Configure default work hours, late threshold, and company profile"
        >
          <form onSubmit={handleSettingsSave} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                value={systemSettings.company_name}
                onChange={(e) =>
                  setSystemSettings({ ...systemSettings, company_name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Shift Start
                </label>
                <input
                  type="time"
                  value={systemSettings.work_start_time}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, work_start_time: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Shift End
                </label>
                <input
                  type="time"
                  value={systemSettings.work_end_time}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, work_end_time: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  value={systemSettings.grace_period_minutes}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, grace_period_minutes: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Work Hours / Day
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={systemSettings.standard_work_hours}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, standard_work_hours: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Helpdesk & Support Contact Email
              </label>
              <input
                type="email"
                value={systemSettings.support_email}
                onChange={(e) =>
                  setSystemSettings({ ...systemSettings, support_email: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={settingsLoading}
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {settingsLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: Portal User Roles Management (Admin) */}
      {isAdmin && activeTab === 'users' && (
        <Card
          title="User Accounts & Access Permissions"
          subtitle="Manage authentication access levels and enable/disable accounts"
        >
          {usersLoading ? (
            <LoadingSpinner text="Retrieving users..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">User Email</th>
                    <th className="py-2.5 px-3">Linked Employee</th>
                    <th className="py-2.5 px-3">Current Role</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{u.email}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {u.first_name ? `${u.first_name} ${u.last_name || ''} (${u.employee_code})` : 'Unlinked'}
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={u.role_id}
                          onChange={(e) => handleRoleChange(u.id, parseInt(e.target.value, 10))}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-500 focus:outline-none"
                        >
                          <option value={1}>Admin</option>
                          <option value={2}>HR</option>
                          <option value={3}>Manager</option>
                          <option value={4}>Employee</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={u.is_active ? 'Active' : 'Inactive'} size="sm">
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {u.id !== user.id ? (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              u.is_active
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Current User</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: Audit Activity Logs (Admin) */}
      {isAdmin && activeTab === 'logs' && (
        <Card
          title="Enterprise Audit Trails"
          subtitle="Real-time security and operational events recorded in MySQL"
          action={
            <div className="relative">
              <input
                type="text"
                placeholder="Search audit events..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  fetchAuditLogs(e.target.value);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-brand-500 focus:outline-none"
              />
            </div>
          }
        >
          {logsLoading ? (
            <LoadingSpinner text="Searching audit records..." />
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Details</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logsList.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{log.action}</td>
                      <td className="py-2 px-3 text-slate-600">{log.details}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">
                        {log.full_name || log.email || 'System'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: Security (Available to All Users) */}
      {activeTab === 'security' && (
        <Card
          title="Account Security & Password"
          subtitle="Change your portal login password"
        >
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={securityForm.currentPassword}
                onChange={(e) =>
                  setSecurityForm({ ...securityForm, currentPassword: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={securityForm.newPassword}
                onChange={(e) =>
                  setSecurityForm({ ...securityForm, newPassword: e.target.value })
                }
                placeholder="Min 6 characters"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={securityForm.confirmPassword}
                onChange={(e) =>
                  setSecurityForm({ ...securityForm, confirmPassword: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={securityLoading}
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {securityLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
