import api from './api';

export const leaveService = {
  getAll: async (params = {}) => {
    const res = await api.get('/leaves', { params });
    return res.data;
  },

  apply: async (data) => {
    const res = await api.post('/leaves', data);
    return res.data;
  },

  approve: async (id, remarks = '') => {
    const res = await api.put(`/leaves/${id}/approve`, { remarks });
    return res.data;
  },

  reject: async (id, remarks) => {
    const res = await api.put(`/leaves/${id}/reject`, { remarks });
    return res.data;
  }
};
