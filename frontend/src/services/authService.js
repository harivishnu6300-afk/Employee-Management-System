import api from "./api";

export const authService = {
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async ({ token, password, confirmPassword }) => {
    const response = await api.post("/auth/reset-password", {
      token,
      password,
      confirmPassword
    });
    return response.data;
  },

  changePassword: async ({ currentPassword, newPassword, confirmPassword }) => {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword
    });
    return response.data;
  }
};
