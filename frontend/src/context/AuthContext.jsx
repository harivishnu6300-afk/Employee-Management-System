import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ems_user") || "null");
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("ems_token"));
  const [loading, setLoading] = useState(true);

  const saveSession = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem("ems_token", newToken);
    } else {
      localStorage.removeItem("ems_token");
    }

    if (newUser) {
      localStorage.setItem("ems_user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("ems_user");
    }

    setToken(newToken || null);
    setUser(newUser || null);
  }, []);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const savedToken = localStorage.getItem("ems_token");

      if (!savedToken) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();

        if (mounted && response.success && response.user) {
          saveSession(savedToken, response.user);
        } else if (mounted) {
          saveSession(null, null);
        }
      } catch {
        if (mounted) saveSession(null, null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [saveSession]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);

    if (!data.success || !data.token || !data.user) {
      throw new Error(data.message || "Login failed.");
    }

    saveSession(data.token, data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);

    if (data.token && data.user) {
      saveSession(data.token, data.user);
    }

    return data;
  };

  const logout = async () => {
    try {
      if (localStorage.getItem("ems_token")) {
        await authService.logout();
      }
    } finally {
      saveSession(null, null);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((previous) => {
      if (!previous) return previous;

      const updated = { ...previous, ...updatedFields };
      localStorage.setItem("ems_user", JSON.stringify(updated));
      return updated;
    });
  };

  const refreshUser = async () => {
    const data = await authService.getMe();

    if (data.success && data.user) {
      saveSession(localStorage.getItem("ems_token"), data.user);
    }

    return data;
  };

  const role = String(user?.role_name || "").toLowerCase();
  const isAdmin = role === "admin";
  const isHR = role === "hr";
  const isManager = role === "manager";
  const isEmployee = role === "employee";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(token && user),
        isAdmin,
        isHR,
        isManager,
        isEmployee,
        login,
        register,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
