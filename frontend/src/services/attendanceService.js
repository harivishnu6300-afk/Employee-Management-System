import api from './api';

export const attendanceService = {
  getAll: async (params = {}) => {
    const res = await api.get('/attendance', { params });
    return res.data;
  },

  getTodayStatus: async () => {
    const res = await api.get('/attendance/today');
    return res.data;
  },

  getEmployeeHistory: async (employeeId, params = {}) => {
    const res = await api.get(`/attendance/${employeeId}`, { params });
    return res.data;
  },

  checkIn: async () => {
    const res = await api.post('/attendance/check-in');
    return res.data;
  },

  checkOut: async () => {
    const res = await api.post('/attendance/check-out');
    return res.data;
  },

  manualRecord: async (data) => {
    const res = await api.post('/attendance/manual', data);
    return res.data;
  }
};
