import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ems_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token expiry / errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Always prefer the backend's descriptive message over the generic Axios one
    const backendMessage = error.response?.data?.message;
    const statusCode = error.response?.status;

    let message;
    if (backendMessage) {
      message = backendMessage;
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message = 'Request timed out. Please check your connection and try again.';
    } else if (!error.response) {
      message = 'Cannot connect to server. Please ensure the backend is running on port 5000.';
    } else {
      message = `Server error (${statusCode}). Please try again.`;
    }

    const path = window.location.pathname;
    const isPublicAuthRoute =
      path.startsWith('/login') ||
      path.startsWith('/register') ||
      path.startsWith('/forgot-password') ||
      path.startsWith('/reset-password');

    if (statusCode === 401) {
      // Clear invalid credentials
      localStorage.removeItem('ems_token');
      localStorage.removeItem('ems_user');

      // Only redirect if user was trying to access a protected internal route
      if (!isPublicAuthRoute) {
        window.location.href = '/login?expired=1';
      }
    }

    // Log unexpected server errors for debugging
    if (statusCode && statusCode >= 500) {
      console.error(`[API] Server error ${statusCode} on ${error.config?.url}:`, message);
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
