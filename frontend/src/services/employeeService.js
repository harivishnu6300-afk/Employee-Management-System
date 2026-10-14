import api from './api';

export const employeeService = {
  getAll: async (params = {}) => {
    const res = await api.get('/employees', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/employees', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/employees/${id}`, data);
    return res.data;
  },

  delete: async (id, permanent = false) => {
    const res = await api.delete(`/employees/${id}`, { params: { permanent } });
    return res.data;
  },

  uploadAvatar: async (id, file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post(`/employees/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};
