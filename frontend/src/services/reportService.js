import api from './api';

export const reportService = {
  getEmployeeReport: async (params = {}) => {
    const res = await api.get('/reports/employees', { params });
    return res.data;
  },

  getAttendanceReport: async (params = {}) => {
    const res = await api.get('/reports/attendance', { params });
    return res.data;
  },

  getLeaveReport: async (params = {}) => {
    const res = await api.get('/reports/leaves', { params });
    return res.data;
  },

  getDepartmentReport: async (params = {}) => {
    const res = await api.get('/reports/departments', { params });
    return res.data;
  },

  downloadCSV: (endpoint, params = {}) => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString();
    const token = localStorage.getItem('ems_token');
    const url = `/api/reports/${endpoint}?${query}`;
    
    // Trigger download with auth header via fetch blob
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
      })
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${endpoint}_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch(err => {
        console.error('Error downloading CSV:', err);
        alert('Failed to download CSV: ' + err.message);
      });
  }
};
