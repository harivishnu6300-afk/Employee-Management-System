import api from './api';

export const adminService = {
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  updateUserRole: async (userId, roleId) => {
    const res = await api.put(`/admin/users/${userId}/role`, { roleId });
    return res.data;
  },

  toggleUserStatus: async (userId, isActive) => {
    const res = await api.put(`/admin/users/${userId}/status`, { isActive });
    return res.data;
  },

  getActivityLogs: async (params = {}) => {
    const res = await api.get('/admin/activity-logs', { params });
    return res.data;
  },

  getSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data;
  },

  updateSettings: async (settings) => {
    const res = await api.put('/admin/settings', settings);
    return res.data;
  }
};
